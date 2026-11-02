export const APP_NAME = 'ChessDesk'
export const APP_TAGLINE = 'School Tournament Manager'
export const APP_VERSION = 1
export const STORAGE_KEY = 'chessdesk:tournament:v1'

export const FORMAT_SWISS = 'swiss'
export const FORMAT_ROUND_ROBIN = 'roundrobin'

export const FORMATS = [
  {
    value: FORMAT_SWISS,
    label: 'Swiss System',
    short: 'Swiss',
    description:
      'Score groups are paired each round. No two players meet twice. Best for large or mixed-ability fields.',
  },
  {
    value: FORMAT_ROUND_ROBIN,
    label: 'Round Robin',
    short: 'Round Robin',
    description:
      'Everybody plays everybody. Best for small groups (6–10 players) where a full schedule is practical.',
  },
]

export const FORMAT_LABELS = {
  [FORMAT_SWISS]: 'Swiss System',
  [FORMAT_ROUND_ROBIN]: 'Round Robin',
}

export const RESULT_WHITE = '1-0'
export const RESULT_DRAW = '0.5-0.5'
export const RESULT_BLACK = '0-1'
export const RESULT_BYE = 'bye'

export const RESULT_OPTIONS = [
  { value: RESULT_WHITE, label: '1–0', short: 'W', title: 'White wins' },
  { value: RESULT_DRAW, label: '½–½', short: 'D', title: 'Draw' },
  { value: RESULT_BLACK, label: '0–1', short: 'B', title: 'Black wins' },
]

export const RESULTS = {
  WHITE: RESULT_WHITE,
  DRAW: RESULT_DRAW,
  BLACK: RESULT_BLACK,
}

const POINTS = {
  [RESULT_WHITE]: { white: 1, black: 0 },
  [RESULT_DRAW]: { white: 0.5, black: 0.5 },
  [RESULT_BLACK]: { white: 0, black: 1 },
}

export function isResult(value) {
  return Object.hasOwn(POINTS, value)
}

export function resultPoints(result) {
  return POINTS[result] ?? null
}

export function resultLabel(result) {
  return RESULT_OPTIONS.find((option) => option.value === result)?.label ?? ''
}

export function playerPointsForPairing(pairing, playerId) {
  if (!pairing) return 0
  if (pairing.byePlayerId) return pairing.byePlayerId === playerId ? 1 : 0
  if (!pairing.result) return 0
  if (pairing.whiteId === playerId) return resultPoints(pairing.result)?.white ?? 0
  if (pairing.blackId === playerId) return resultPoints(pairing.result)?.black ?? 0
  return 0
}

export const DEFAULT_RATING = 1000
export const MAX_RATING = 3000
