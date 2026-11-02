import { DEFAULT_RATING, RESULT_BYE } from './constants.js'
import { t } from './i18n.js'
import { downloadText, slugify, todayISO } from './utils.js'

function splitCsvLine(line, delimiter) {
  const values = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === delimiter && !insideQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  return values
}

function detectDelimiter(line) {
  const candidates = ['\t', ';', ',']
  let best = ','
  let bestCount = 0
  for (const candidate of candidates) {
    const count = splitCsvLine(line, candidate).length
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

/**
 * Parse a pasted list. Each non-empty line becomes a player:
 *   Name, Class, Rating
 * Rating and class are optional. A header row is detected and skipped.
 */
export function parsePlayerImport(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  if (!lines.length) {
    return { players: [], errors: [t('csv.parse.empty')], duplicates: 0 }
  }

  const delimiter = detectDelimiter(lines[0])
  const firstCells = splitCsvLine(lines[0], delimiter)
  const hasHeader = /^(full\s*)?name$|player|nama/i.test(firstCells[0] ?? '')
  const dataLines = hasHeader ? lines.slice(1) : lines
  const errors = []
  const players = []
  const seen = new Set()
  let duplicates = 0

  dataLines.forEach((line, index) => {
    const cells = splitCsvLine(line, delimiter)
    const name = (cells[0] ?? '').replace(/\s+/g, ' ').trim()
    const lineNumber = index + (hasHeader ? 2 : 1)

    if (!name) {
      errors.push(t('csv.parse.missingName', { line: lineNumber }))
      return
    }

    let grade = ''
    let rating = DEFAULT_RATING

    if (cells.length >= 2) {
      grade = cells[1].trim()
    }
    if (cells.length >= 3) {
      const parsed = Number.parseFloat(String(cells[2]).replace(',', '.'))
      if (Number.isFinite(parsed)) rating = Math.max(0, Math.min(3000, Math.round(parsed)))
    } else if (cells.length === 2 && /^\d{2,4}$/.test(cells[1].trim())) {
      // "Name, 1450" — a numeric second column is treated as a rating.
      grade = ''
      rating = Math.max(0, Math.min(3000, Number(cells[1].trim())))
    }

    const key = name.toLowerCase()
    if (seen.has(key)) {
      duplicates += 1
      errors.push(t('csv.parse.duplicate', { line: lineNumber, name }))
      return
    }
    seen.add(key)

    players.push({ name, grade, rating })
  })

  return { players, errors, duplicates }
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

function filenameBase(tournament) {
  return `${slugify(tournament?.name || 'tournament')}-${todayISO()}`
}

function saveCsv(filename, rows) {
  // The BOM tells Excel that the file is UTF-8, so names with accents survive.
  downloadText(filename, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8')
}

export function exportStandingsCsv(standings, tournament) {
  const rows = [
    [
      t('csv.header.rank'),
      t('csv.header.player'),
      t('csv.header.class'),
      t('csv.header.rating'),
      t('csv.header.points'),
      t('csv.header.buchholz'),
      t('csv.header.sb'),
      t('csv.header.direct'),
      t('csv.header.won'),
      t('csv.header.drawn'),
      t('csv.header.lost'),
      t('csv.header.byes'),
      t('csv.header.status'),
    ],
    ...standings.map((row) => [
      row.rank,
      row.name,
      row.grade || '—',
      row.rating,
      row.points,
      row.buchholzCut1,
      row.sonnebornBerger,
      row.directEncounter,
      row.wins,
      row.draws,
      row.losses,
      row.byes,
      row.status === 'withdrawn' ? t('csv.status.withdrawn') : t('csv.status.active'),
    ]),
  ]
  saveCsv(`${filenameBase(tournament)}-standings.csv`, rows)
}

export function exportPairingsCsv(state) {
  const playersById = new Map(state.players.map((player) => [player.id, player]))
  const rows = [
    [
      t('csv.header.round'),
      t('csv.header.roundStatus'),
      t('csv.header.board'),
      t('csv.header.white'),
      t('csv.header.whiteClass'),
      t('csv.header.whiteRating'),
      t('csv.header.result'),
      t('csv.header.black'),
      t('csv.header.blackClass'),
      t('csv.header.blackRating'),
      t('csv.header.byePlayer'),
    ],
  ]

  for (const round of [...state.rounds].sort((a, b) => a.number - b.number)) {
    for (const pairing of round.pairings ?? []) {
      if (pairing.byePlayerId) {
        const player = playersById.get(pairing.byePlayerId)
        rows.push([
          round.number,
          t(round.status === 'locked' ? 'csv.status.locked' : 'csv.status.draft'),
          pairing.board,
          '',
          '',
          '',
          t('csv.result.bye'),
          '',
          '',
          '',
          player?.name ?? t('data.unknownPlayer'),
        ])
        continue
      }
      const white = playersById.get(pairing.whiteId)
      const black = playersById.get(pairing.blackId)
      rows.push([
        round.number,
        t(round.status === 'locked' ? 'csv.status.locked' : 'csv.status.draft'),
        pairing.board,
        white?.name ?? t('data.unknownPlayer'),
        white?.grade ?? '',
        white?.rating ?? '',
        pairing.result || t('csv.result.notReported'),
        black?.name ?? t('data.unknownPlayer'),
        black?.grade ?? '',
        black?.rating ?? '',
        '',
      ])
    }
  }

  saveCsv(`${filenameBase(state.tournament)}-pairings.csv`, rows)
}

export function exportPlayersCsv(state) {
  const rows = [
    [t('csv.header.name'), t('csv.header.class'), t('csv.header.rating'), t('csv.header.status')],
    ...state.players.map((player) => [
      player.name,
      player.grade || '',
      player.rating,
      player.status === 'withdrawn' ? t('csv.status.withdrawn') : t('csv.status.active'),
    ]),
  ]
  saveCsv(`${filenameBase(state.tournament)}-players.csv`, rows)
}

export function downloadPlayerTemplate() {
  downloadText(
    'chessdesk-player-import-template.csv',
    `\uFEFF${t('csv.template.header')}\r\nNur Aisyah binti Ahmad,5 Amanah,1400\r\nMuhammad Danish,5 Bestari,1320\r\nTan Wei Ling,4 Cekal,1250\r\n`,
    'text/csv;charset=utf-8',
  )
}

export function pairingsCsvPreview(state, roundNumber) {
  const playersById = new Map(state.players.map((player) => [player.id, player]))
  const round = state.rounds.find((item) => item.number === roundNumber)
  return (round?.pairings ?? []).map((pairing) => {
    if (pairing.byePlayerId) {
      return {
        board: pairing.board,
        white: '—',
        black: '—',
        bye: playersById.get(pairing.byePlayerId)?.name ?? t('data.unknownPlayer'),
        result: RESULT_BYE,
      }
    }
    return {
      board: pairing.board,
      white: playersById.get(pairing.whiteId)?.name ?? t('data.unknownPlayer'),
      black: playersById.get(pairing.blackId)?.name ?? t('data.unknownPlayer'),
      bye: null,
      result: pairing.result,
    }
  })
}

export function describeFormat(format) {
  return format === 'roundrobin' ? t('format.roundrobin.label') : t('format.swiss.label')
}
