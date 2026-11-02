import { APP_VERSION, DEFAULT_RATING, FORMAT_SWISS, STORAGE_KEY } from './constants.js'
import { t } from './i18n.js'
import { todayISO, uid } from './utils.js'

export function createEmptyState() {
  return {
    version: APP_VERSION,
    tournament: {
      name: t('app.defaultTournamentName'),
      venue: '',
      date: todayISO(),
      arbiter: '',
      format: FORMAT_SWISS,
      totalRounds: 6,
      createdAt: new Date().toISOString(),
    },
    players: [],
    teams: [],
    rounds: [],
    teamRounds: [],
    settings: {
      showRatingsOnPrint: true,
      includeStandingsOnPrint: true,
    },
  }
}

function normalizePlayer(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name ?? '').trim()
  if (!name) return null
  return {
    id: String(raw.id || uid('pl')),
    name,
    grade: String(raw.grade ?? '').trim(),
    rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : DEFAULT_RATING,
    status: raw.status === 'withdrawn' ? 'withdrawn' : 'active',
    absences: Array.isArray(raw.absences)
      ? [...new Set(raw.absences.map(Number).filter(Number.isInteger))]
      : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    seed: Number.isFinite(Number(raw.seed)) ? Number(raw.seed) : index + 1,
    teamId: raw.teamId ? String(raw.teamId) : null,
    contributesToTeam: raw.contributesToTeam === false ? false : Boolean(raw.teamId),
  }
}

function normalizeTeam(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name ?? '').trim()
  if (!name) return null
  return {
    id: String(raw.id || uid('team')),
    name,
    createdAt: raw.createdAt || new Date().toISOString(),
  }
}

function normalizePairing(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const whites = raw.whiteId || null
  const blacks = raw.blackId || null
  const bye = raw.byePlayerId || null
  const validResult = ['1-0', '0-1', '0.5-0.5', 'bye'].includes(raw.result)
  return {
    id: String(raw.id || uid('pair')),
    board: Number.isFinite(Number(raw.board)) ? Number(raw.board) : index + 1,
    whiteId: whites,
    blackId: blacks,
    byePlayerId: bye,
    result: validResult ? raw.result : null,
  }
}

function normalizeRound(raw, playersById) {
  if (!raw || typeof raw !== 'object') return null
  const number = Number(raw.number)
  if (!Number.isInteger(number) || number < 1) return null

  const pairings = (Array.isArray(raw.pairings) ? raw.pairings : [])
    .map(normalizePairing)
    .filter(Boolean)
    .filter(
      (pairing) =>
        (pairing.whiteId && playersById.has(pairing.whiteId) &&
          pairing.blackId && playersById.has(pairing.blackId)) ||
        (pairing.byePlayerId && playersById.has(pairing.byePlayerId)),
    )
    .map((pairing, index) => ({ ...pairing, board: index + 1 }))

  return {
    id: String(raw.id || uid('round')),
    number,
    status: raw.status === 'locked' ? 'locked' : 'draft',
    pairings,
    createdAt: raw.createdAt || new Date().toISOString(),
    lockedAt: raw.lockedAt || null,
  }
}

export function normalizeState(raw) {
  const candidate =
    raw && typeof raw === 'object' && raw.state && typeof raw.state === 'object'
      ? raw.state
      : raw

  if (!candidate || typeof candidate !== 'object') {
    throw new Error(t('errors.backup.notTournament'))
  }
  if (!Array.isArray(candidate.players) || !Array.isArray(candidate.rounds)) {
    throw new Error(t('errors.backup.missingData'))
  }

  const base = createEmptyState()
  const teams = (Array.isArray(candidate.teams) ? candidate.teams : [])
    .map(normalizeTeam)
    .filter(Boolean)

  const teamIds = new Set()
  for (const team of teams) {
    if (teamIds.has(team.id)) team.id = uid('team')
    teamIds.add(team.id)
  }
  const teamsById = new Map(teams.map((team) => [team.id, team]))

  const players = candidate.players
    .map(normalizePlayer)
    .filter(Boolean)

  const ids = new Set()
  for (const player of players) {
    if (ids.has(player.id)) player.id = uid('pl')
    ids.add(player.id)
    if (player.teamId && !teamsById.has(player.teamId)) {
      player.teamId = null
      player.contributesToTeam = false
    }
    if (!player.teamId) player.contributesToTeam = false
  }
  const playersById = new Map(players.map((player) => [player.id, player]))

  const rounds = candidate.rounds
    .map((round) => normalizeRound(round, playersById))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number)

  const teamRounds = (Array.isArray(candidate.teamRounds) ? candidate.teamRounds : [])
    .map((round) => normalizeRound(round, teamsById))
    .filter(Boolean)
    .sort((a, b) => a.number - b.number)

  const tournament = candidate.tournament && typeof candidate.tournament === 'object'
    ? candidate.tournament
    : {}
  const settings = candidate.settings && typeof candidate.settings === 'object'
    ? candidate.settings
    : {}

  return {
    version: APP_VERSION,
    tournament: {
      ...base.tournament,
      ...tournament,
      name: String(tournament.name || base.tournament.name),
      format: tournament.format === 'roundrobin' ? 'roundrobin' : FORMAT_SWISS,
      totalRounds: Math.max(
        1,
        Number(tournament.totalRounds) || base.tournament.totalRounds,
        rounds.length,
      ),
    },
    players,
    teams,
    rounds,
    teamRounds,
    settings: { ...base.settings, ...settings },
  }
}

export function loadState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY)
    if (!serialized) return createEmptyState()
    return normalizeState(JSON.parse(serialized))
  } catch (error) {
    console.warn('Could not restore the saved tournament:', error)
    return createEmptyState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error?.name === 'QuotaExceededError'
          ? t('errors.storage.full')
          : t('errors.storage.save'),
    }
  }
}

export function storageSize(state) {
  try {
    return new Blob([JSON.stringify(state)]).size
  } catch {
    return 0
  }
}
