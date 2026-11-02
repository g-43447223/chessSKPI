import { generatePairings } from './pairings.js'
import { createEmptyState } from './storage.js'
import { todayISO } from './utils.js'

const DEMO_PLAYERS = [
  ['Muhammad Harith bin Zulkifli', '5 Amanah', 1580],
  ['Nur Aisyah binti Kamal', '5 Amanah', 1540],
  ['Tan Wei Ling', '5 Bestari', 1510],
  ['Arjun a/l Rajesh', '4 Cekal', 1480],
  ['Siti Hajar binti Roslan', '5 Bestari', 1450],
  ['Lim Jia Hui', '4 Amanah', 1420],
  ['Muhammad Firdaus bin Azman', '3 Cekal', 1390],
  ['Kavitha a/p Suresh', '5 Cekal', 1360],
  ['Adam Rayyan bin Faizal', '4 Bestari', 1330],
  ['Ong Xin Yi', '3 Amanah', 1300],
  ['Wan Nur Fatihah binti Ismail', '5 Dinamik', 1270],
  ['Chong Kai Wen', '4 Dinamik', 1240],
  ['Prem Kumar a/l Anandan', '3 Bestari', 1210],
]

function hash(text) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function demoResult(pairing, roundNumber, playersById) {
  if (pairing.byePlayerId) return 'bye'
  const white = playersById.get(pairing.whiteId)
  const black = playersById.get(pairing.blackId)
  if (!white || !black) return null

  const roll = hash(`${roundNumber}:${pairing.whiteId}:${pairing.blackId}`) % 100
  if (roll < 20) return '0.5-0.5'

  const whiteIsStronger = (white.rating ?? 0) >= (black.rating ?? 0)
  const strongerWins = roll < 70
  const whiteWins = whiteIsStronger ? strongerWins : !strongerWins
  return whiteWins ? '1-0' : '0-1'
}

/**
 * A realistic sample tournament (13 players, 3 of 6 Swiss rounds completed)
 * used by the "Load demo" button. Results are deterministic, not random.
 */
export function buildDemoState() {
  const state = createEmptyState()
  state.tournament = {
    ...state.tournament,
    name: 'Kejohanan Catur MSSD Seri Bestari',
    venue: 'Dewan Seri Bestari',
    date: todayISO(),
    arbiter: 'Cikgu Nurul Huda',
    format: 'swiss',
    totalRounds: 6,
  }

  state.players = DEMO_PLAYERS.map(([name, grade, rating], index) => ({
    id: `pl_demo_${index + 1}`,
    name,
    grade,
    rating,
    status: 'active',
    absences: [],
    seed: index + 1,
    createdAt: new Date().toISOString(),
  }))

  const playersById = new Map(state.players.map((player) => [player.id, player]))

  // Withdraw the lowest seed after round 2 so the demo also shows
  // how withdrawals are displayed in the standings.
  const withdrawAfterRound = 2

  for (let number = 1; number <= 3; number += 1) {
    if (number > 2) {
      const player = state.players.find((item) => item.id === 'pl_demo_13')
      if (player) player.status = 'withdrawn'
    }

    const generated = generatePairings(state, number)
    if (generated.error) break

    state.rounds.push({
      id: `round_demo_${number}`,
      number,
      status: 'locked',
      createdAt: new Date().toISOString(),
      lockedAt: new Date().toISOString(),
      pairings: generated.pairings.map((pairing) => ({
        ...pairing,
        result: demoResult(pairing, number, playersById),
      })),
    })
  }

  void withdrawAfterRound
  return state
}
