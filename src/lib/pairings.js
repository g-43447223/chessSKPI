import { FORMAT_ROUND_ROBIN, RESULT_BYE } from './constants.js'
import { t } from './i18n.js'
import { buildPlayerStats } from './stats.js'
import { uid } from './utils.js'

export function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function comparePlayers(a, b, stats) {
  const pa = stats.get(a.id)?.points ?? 0
  const pb = stats.get(b.id)?.points ?? 0
  if (pb !== pa) return pb - pa
  const ra = a.rating ?? 0
  const rb = b.rating ?? 0
  if (rb !== ra) return rb - ra
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
}

function colorNeed(stats) {
  if (!stats) return null
  const history = stats.colorHistory
  if (history.length >= 2) {
    const last = history[history.length - 1]
    const previous = history[history.length - 2]
    if (last === previous) return last === 'w' ? 'b' : 'w'
  }
  const difference = stats.white - stats.black
  if (difference >= 2) return 'b'
  if (difference <= -2) return 'w'
  if (history.length) return history[history.length - 1] === 'w' ? 'b' : 'w'
  return null
}

function colorClash(first, second, stats) {
  const needA = colorNeed(stats.get(first.id))
  const needB = colorNeed(stats.get(second.id))
  return needA && needB && needA === needB ? 4 : 0
}

function colorCost(stats, color) {
  if (!stats) return 0
  const history = stats.colorHistory
  const last = history[history.length - 1]
  let cost = 0

  if (last === color) {
    cost += 6
    if (history.length >= 2 && history[history.length - 2] === color) cost += 100
  }

  const difference = stats.white - stats.black
  const nextDifference = difference + (color === 'w' ? 1 : -1)
  cost += Math.abs(nextDifference) * 3
  if (Math.abs(nextDifference) >= 2) cost += 6

  return cost
}

function assignColors(pairs, stats) {
  return pairs.map(([first, second]) => {
    const firstWhite =
      colorCost(stats.get(first.id), 'w') + colorCost(stats.get(second.id), 'b')
    const secondWhite =
      colorCost(stats.get(first.id), 'b') + colorCost(stats.get(second.id), 'w')

    let white = first
    let black = second

    if (secondWhite < firstWhite) {
      white = second
      black = first
    } else if (secondWhite === firstWhite) {
      const firstDiff =
        (stats.get(first.id)?.white ?? 0) - (stats.get(first.id)?.black ?? 0)
      const secondDiff =
        (stats.get(second.id)?.white ?? 0) - (stats.get(second.id)?.black ?? 0)
      if (secondDiff < firstDiff) {
        white = second
        black = first
      } else if (secondDiff === firstDiff) {
        const ratingA = first.rating ?? 0
        const ratingB = second.rating ?? 0
        if (ratingB > ratingA) {
          white = second
          black = first
        }
      }
    }

    return { white, black }
  })
}

function detectColorWarnings(assigned, stats) {
  const warnings = []
  for (const { white, black } of assigned) {
    for (const [player, color] of [
      [white, 'w'],
      [black, 'b'],
    ]) {
      const history = stats.get(player.id)?.colorHistory ?? []
      if (
        history.length >= 2 &&
        history[history.length - 1] === color &&
        history[history.length - 2] === color
      ) {
        warnings.push(
          t('warnings.pairings.thirdColor', {
            name: player.name,
            color: color === 'w' ? t('warnings.color.white') : t('warnings.color.black'),
          }),
        )
      }
    }
  }
  return warnings
}

function searchGroupMatching(pool, played, stats, allowRematch) {
  let nodes = 0
  const NODE_LIMIT = 40000

  function search(remaining) {
    if (remaining.length === 0) return []
    if (++nodes > NODE_LIMIT) return null

    const player = remaining[0]
    const rest = remaining.slice(1)
    const target = remaining.length / 2
    const candidates = []

    for (let index = 0; index < rest.length; index += 1) {
      const opponent = rest[index]
      const alreadyPlayed = played.has(pairKey(player.id, opponent.id))
      if (alreadyPlayed && !allowRematch) continue

      let cost = Math.abs(index + 1 - target) * 10
      if (alreadyPlayed) cost += 100000
      cost += colorClash(player, opponent, stats)
      candidates.push({ opponent, index, cost })
    }

    candidates.sort((a, b) => a.cost - b.cost || a.index - b.index)

    for (const candidate of candidates) {
      const next = rest.filter((_, index) => index !== candidate.index)
      const solution = search(next)
      if (solution) return [[player, candidate.opponent], ...solution]
    }

    return null
  }

  return search(pool)
}

function matchScoreGroup(pool, played, stats) {
  const clean = searchGroupMatching(pool, played, stats, false)
  if (clean) return { pairs: clean, rematches: [] }

  const permissive = searchGroupMatching(pool, played, stats, true)
  const pairs = permissive ?? pool.reduce((accumulator, player, index) => {
    if (index % 2 === 0 && pool[index + 1]) accumulator.push([player, pool[index + 1]])
    return accumulator
  }, [])

  const rematches = pairs
    .filter(([first, second]) => played.has(pairKey(first.id, second.id)))
    .map(([first, second]) => `${first.name} vs ${second.name}`)

  return { pairs, rematches }
}

function pairSwiss(sorted, played, stats) {
  const groups = []
  for (const player of sorted) {
    const points = stats.get(player.id)?.points ?? 0
    const last = groups[groups.length - 1]
    if (last && last.points === points) last.players.push(player)
    else groups.push({ points, players: [player] })
  }

  const pairs = []
  const rematches = []
  let pending = null

  for (const group of groups) {
    const pool = (pending ? [pending, ...group.players] : [...group.players]).sort(
      (a, b) => comparePlayers(a, b, stats),
    )
    pending = null

    if (pool.length % 2 === 1) pending = pool.pop()
    if (pool.length < 2) continue

    const result = matchScoreGroup(pool, played, stats)
    pairs.push(...result.pairs)
    rematches.push(...result.rematches)
  }

  // Safety net: with an even field this should never happen.
  if (pending) {
    const fallback = sorted.find((player) => player.id !== pending.id)
    if (fallback) pairs.push([pending, fallback])
  }

  return { pairs, rematches }
}

function searchRoundRobin(pool, played, stats, allowRematch) {
  let nodes = 0
  const NODE_LIMIT = 60000

  function search(remaining) {
    if (remaining.length === 0) return []
    if (++nodes > NODE_LIMIT) return null

    let chosenIndex = 0
    let fewestAvailable = Number.POSITIVE_INFINITY
    for (let index = 0; index < remaining.length; index += 1) {
      let available = 0
      for (const other of remaining) {
        if (other === remaining[index]) continue
        if (!played.has(pairKey(remaining[index].id, other.id))) available += 1
      }
      if (available < fewestAvailable) {
        fewestAvailable = available
        chosenIndex = index
      }
    }

    if (!allowRematch && fewestAvailable === 0) return null

    const player = remaining[chosenIndex]
    const rest = remaining.filter((_, index) => index !== chosenIndex)
    const candidates = []

    for (let index = 0; index < rest.length; index += 1) {
      const opponent = rest[index]
      const alreadyPlayed = played.has(pairKey(player.id, opponent.id))
      if (alreadyPlayed && !allowRematch) continue
      let cost = alreadyPlayed ? 100000 : 0
      cost += Math.abs(index - rest.length / 2) * 2
      cost += colorClash(player, opponent, stats) * 2
      candidates.push({ opponent, index, cost })
    }

    candidates.sort((a, b) => a.cost - b.cost || a.index - b.index)

    for (const candidate of candidates) {
      const next = rest.filter((_, index) => index !== candidate.index)
      const solution = search(next)
      if (solution) return [[player, candidate.opponent], ...solution]
    }

    return null
  }

  return search(pool)
}

function pairRoundRobin(sorted, played, stats) {
  let pairs = searchRoundRobin(sorted, played, stats, false)
  let rematches = []

  if (!pairs) {
    pairs = searchRoundRobin(sorted, played, stats, true)
  }

  if (!pairs) {
    pairs = []
    for (let index = 0; index + 1 < sorted.length; index += 2) {
      pairs.push([sorted[index], sorted[index + 1]])
    }
  }

  rematches = pairs
    .filter(([first, second]) => played.has(pairKey(first.id, second.id)))
    .map(([first, second]) => `${first.name} vs ${second.name}`)

  return { pairs, rematches }
}

/**
 * A stable circle-method schedule guarantees a complete round robin.
 * It is used when every scheduled game is still unplayed; if the roster
 * changed (late entries, absences) we fall back to flexible matching.
 */
function circleSchedule(order) {
  const rotation = [...order]
  if (rotation.length % 2 === 1) rotation.push(null)
  const size = rotation.length
  const rounds = []

  for (let roundIndex = 0; roundIndex < size - 1; roundIndex += 1) {
    const pairs = []
    let bye = null
    for (let index = 0; index < size / 2; index += 1) {
      const first = rotation[index]
      const second = rotation[size - 1 - index]
      if (!first) bye = second
      else if (!second) bye = first
      else pairs.push([first, second])
    }
    rounds.push({ pairs, bye })
    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop())
    rotation.splice(0, rotation.length, fixed, ...rest)
  }

  return rounds
}

function tryCirclePairings(eligible, played, stats, roundNumber) {
  const order = [...eligible].sort(
    (a, b) =>
      (a.seed ?? 0) - (b.seed ?? 0) ||
      a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
  )
  const schedule = circleSchedule(order)
  if (!schedule.length) return null

  const { pairs, bye } = schedule[(roundNumber - 1) % schedule.length]
  const hasRepeat = pairs.some(([first, second]) =>
    played.has(pairKey(first.id, second.id)),
  )
  if (hasRepeat) return null

  const ordered = [...pairs].sort((a, b) => comparePlayers(a[0], b[0], stats))
  return { pairs: ordered, bye, deviated: false }
}

/** Global rematch-free matching, used when score-group pairing gets stuck. */
function matchAllNoRematch(pool, played, stats) {
  let nodes = 0
  const NODE_LIMIT = 120000

  function search(remaining) {
    if (remaining.length === 0) return []
    if (++nodes > NODE_LIMIT) return null

    const player = remaining[0]
    const rest = remaining.slice(1)
    const target = remaining.length / 2
    const candidates = []

    for (let index = 0; index < rest.length; index += 1) {
      const opponent = rest[index]
      if (played.has(pairKey(player.id, opponent.id))) continue
      const scoreGap = Math.abs(
        (stats.get(player.id)?.points ?? 0) - (stats.get(opponent.id)?.points ?? 0),
      )
      let cost = scoreGap * 1000
      cost += Math.abs(index + 1 - target) * 10
      cost += colorClash(player, opponent, stats)
      candidates.push({ opponent, index, cost })
    }

    candidates.sort((a, b) => a.cost - b.cost || a.index - b.index)

    for (const candidate of candidates) {
      const next = rest.filter((_, index) => index !== candidate.index)
      const solution = search(next)
      if (solution) return [[player, candidate.opponent], ...solution]
    }

    return null
  }

  return search(pool)
}

function selectBye(sorted, stats) {
  if (sorted.length % 2 === 0) return { bye: null, repeated: false }

  const withoutBye = sorted.filter((player) => (stats.get(player.id)?.byes ?? 0) === 0)
  const pool = withoutBye.length ? withoutBye : sorted
  const bye = pool[pool.length - 1]

  return {
    bye,
    repeated: withoutBye.length === 0,
  }
}

/**
 * Produce a set of pairings for one round.
 * Pure function: returns a result object and never touches the store.
 */
export function generatePairings(state, roundNumber) {
  const number = Number(roundNumber)
  const tournament = state.tournament
  const totalRounds = Number(tournament.totalRounds) || 1

  if (!Number.isInteger(number) || number < 1) {
    return { error: t('errors.pairings.invalidRound') }
  }
  if (number > totalRounds) {
    return {
      error: t('errors.pairings.roundLimit', { count: totalRounds }),
    }
  }

  const previousRounds = state.rounds.filter((round) => round.number < number)
  const unlocked = previousRounds.find((round) => round.status !== 'locked')
  if (unlocked) {
    return {
      error: t('errors.pairings.previousUnlocked', { round: unlocked.number, next: number }),
    }
  }

  const allPlayers = state.players
  const eligible = allPlayers.filter(
    (player) =>
      (player.status ?? 'active') === 'active' &&
      !(player.absences ?? []).includes(number),
  )

  if (eligible.length < 2) {
    return {
      error: t('errors.pairings.needTwo'),
    }
  }

  const stats = buildPlayerStats(allPlayers, previousRounds)
  const format = tournament.format === FORMAT_ROUND_ROBIN ? FORMAT_ROUND_ROBIN : 'swiss'

  const sorted = [...eligible].sort((a, b) => {
    if (format === FORMAT_ROUND_ROBIN) {
      const gamesA = stats.get(a.id)?.games ?? 0
      const gamesB = stats.get(b.id)?.games ?? 0
      if (gamesA !== gamesB) return gamesA - gamesB
      const byesA = stats.get(a.id)?.byes ?? 0
      const byesB = stats.get(b.id)?.byes ?? 0
      if (byesA !== byesB) return byesA - byesB
    }
    return comparePlayers(a, b, stats)
  })

  const played = new Set()
  for (const player of eligible) {
    for (const opponentId of stats.get(player.id)?.opponents ?? []) {
      played.add(pairKey(player.id, opponentId))
    }
  }

  const warnings = []
  let bye = null
  let repeated = false
  let pairingResult

  if (format === FORMAT_ROUND_ROBIN) {
    const circle = tryCirclePairings(eligible, played, stats, number)
    if (circle) {
      bye = circle.bye
      pairingResult = { pairs: circle.pairs, rematches: [] }
    } else {
      ;({ bye, repeated } = selectBye(sorted, stats))
      const pool = bye ? sorted.filter((player) => player.id !== bye.id) : sorted
      pairingResult = pairRoundRobin(pool, played, stats)
      warnings.push(t('warnings.pairings.circleAdjusted'))
    }
  } else {
    ;({ bye, repeated } = selectBye(sorted, stats))
    const pool = bye ? sorted.filter((player) => player.id !== bye.id) : sorted
    pairingResult = pairSwiss(pool, played, stats)

    // If score groups force a repeat, a wider search can usually avoid it.
    if (pairingResult.rematches.length) {
      const replacement = matchAllNoRematch(pool, played, stats)
      if (replacement) {
        pairingResult = { pairs: replacement, rematches: [] }
        warnings.push(t('warnings.pairings.crossGroup'))
      }
    }
  }

  if (bye) {
    warnings.unshift(
      t('warnings.pairings.bye', {
        name: bye.name,
        repeated: repeated ? t('warnings.pairings.byeRepeated') : '',
      }),
    )
  }

  if (pairingResult.rematches.length) {
    warnings.push(
      t('warnings.pairings.repeat', { pairs: pairingResult.rematches.join(', ') }),
    )
  }

  const assigned = assignColors(pairingResult.pairs, stats)
  warnings.push(...detectColorWarnings(assigned, stats))

  const pairings = assigned.map(({ white, black }, index) => ({
    id: uid('pair'),
    board: index + 1,
    whiteId: white.id,
    blackId: black.id,
    byePlayerId: null,
    result: null,
  }))

  if (bye) {
    pairings.push({
      id: uid('pair'),
      board: pairings.length + 1,
      whiteId: null,
      blackId: null,
      byePlayerId: bye.id,
      result: RESULT_BYE,
    })
  }

  return {
    roundNumber: number,
    format,
    pairings,
    warnings,
    byePlayerId: bye?.id ?? null,
    eligibleCount: eligible.length,
  }
}

/** Players who should appear in a round's pairings, given attendance. */
export function expectedPlayerIds(players, roundNumber) {
  return players
    .filter(
      (player) =>
        (player.status ?? 'active') === 'active' &&
        !(player.absences ?? []).includes(roundNumber),
    )
    .map((player) => player.id)
}

/** True when attendance changed after the round was generated. */
export function pairingsAreStale(players, round) {
  if (!round || round.status === 'locked') return false
  const expected = new Set(expectedPlayerIds(players, round.number))
  const paired = new Set()
  for (const pairing of round.pairings ?? []) {
    if (pairing.byePlayerId) paired.add(pairing.byePlayerId)
    if (pairing.whiteId) paired.add(pairing.whiteId)
    if (pairing.blackId) paired.add(pairing.blackId)
  }
  if (expected.size !== paired.size) return true
  for (const id of expected) if (!paired.has(id)) return true
  return false
}
