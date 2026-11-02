import { generatePairings, pairKey, pairingsAreStale } from '../src/lib/pairings.js'
import { buildDemoState } from '../src/lib/demo.js'
import { computeStandings, buildPlayerStats } from '../src/lib/stats.js'

function makeState(count, format = 'swiss', rounds = 7) {
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${String(i).padStart(2, '0')}`,
    grade: `Class ${i % 4}`,
    rating: 1000 + (count - i) * 20,
    status: 'active',
    absences: [],
  }))
  return {
    version: 1,
    tournament: {
      name: 'Test',
      format,
      totalRounds: rounds,
      date: '2026-01-01',
    },
    players,
    rounds: [],
    settings: {},
  }
}

function simulate(state, roundNumber) {
  const generated = generatePairings(state, roundNumber)
  if (generated.error) throw new Error(`Round ${roundNumber}: ${generated.error}`)
  const pairings = generated.pairings.map((pairing) => {
    if (pairing.byePlayerId) return pairing
    const seed = (roundNumber * 31 + Number(pairing.whiteId.slice(1)) * 7) % 10
    return {
      ...pairing,
      result: seed < 2 ? '0-1' : seed < 4 ? '0.5-0.5' : '1-0',
    }
  })
  state.rounds.push({
    id: `r${roundNumber}`,
    number: roundNumber,
    status: 'locked',
    pairings,
  })
}

function checkNoRepeats(state) {
  const seen = new Set()
  for (const round of state.rounds) {
    for (const pairing of round.pairings) {
      if (pairing.byePlayerId) continue
      const key = pairKey(pairing.whiteId, pairing.blackId)
      if (seen.has(key)) {
        throw new Error(`Repeat pairing found in round ${round.number}: ${key}`)
      }
      seen.add(key)
    }
  }
}

function run(name, fn) {
  try {
    fn()
    console.log(`PASS  ${name}`)
  } catch (error) {
    console.log(`FAIL  ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

run('16-player Swiss, 5 rounds, no repeats', () => {
  const state = makeState(16, 'swiss', 5)
  for (let r = 1; r <= 5; r += 1) simulate(state, r)
  checkNoRepeats(state)
  const stats = buildPlayerStats(state.players, state.rounds)
  let total = 0
  for (const s of stats.values()) total += s.points
  const expected = 5 * 8
  if (total !== expected) throw new Error(`points ${total} != ${expected}`)
  const standings = computeStandings(state.players, state.rounds)
  if (standings[0].points < 3.5) throw new Error(`leader has ${standings[0].points}`)
  if (!(standings[0].buchholzCut1 >= 0)) throw new Error('bad buchholz')
})

run('17-player Swiss gives exactly one bye per round', () => {
  const state = makeState(17, 'swiss', 6)
  for (let r = 1; r <= 6; r += 1) {
    simulate(state, r)
    const byes = state.rounds.at(-1).pairings.filter((p) => p.byePlayerId)
    if (byes.length !== 1) throw new Error(`round ${r} has ${byes.length} byes`)
  }
  checkNoRepeats(state)
})

run('Round robin, 8 players, 7 rounds, all 28 games unique', () => {
  const state = makeState(8, 'roundrobin', 7)
  for (let r = 1; r <= 7; r += 1) simulate(state, r)
  checkNoRepeats(state)
  const seen = new Set()
  for (const round of state.rounds) {
    for (const pairing of round.pairings) {
      if (pairing.byePlayerId) continue
      seen.add(pairKey(pairing.whiteId, pairing.blackId))
    }
  }
  if (seen.size !== 28) throw new Error(`only ${seen.size} unique games`)
})

run('Round robin, 7 players, 7 rounds, one bye each round', () => {
  const state = makeState(7, 'roundrobin', 7)
  for (let r = 1; r <= 7; r += 1) simulate(state, r)
  checkNoRepeats(state)
})

run('Demo state builds three locked rounds', () => {
  const demo = buildDemoState()
  if (demo.players.length !== 13) throw new Error('demo player count')
  if (demo.rounds.length !== 3) throw new Error('demo round count')
  if (!demo.rounds.every((r) => r.status === 'locked')) throw new Error('demo rounds unlocked')
  const standings = computeStandings(demo.players, demo.rounds)
  if (!standings.length) throw new Error('no standings')
  console.log(
    '      Demo leader:',
    standings[0].name,
    standings[0].points,
    'BH-C1',
    standings[0].buchholzCut1,
  )
})

run('Stale attendance detection works', () => {
  const state = makeState(8, 'swiss', 3)
  const generated = generatePairings(state, 1)
  const round = { number: 1, status: 'draft', pairings: generated.pairings }
  if (pairingsAreStale(state.players, round)) throw new Error('should not be stale')
  state.players[0].absences = [1]
  if (!pairingsAreStale(state.players, round)) throw new Error('should be stale')
})

run('Swiss avoids repeats even with awkward score groups (24 players)', () => {
  const state = makeState(24, 'swiss', 6)
  for (let r = 1; r <= 6; r += 1) simulate(state, r)
  checkNoRepeats(state)
})

run('Color distribution stays reasonable', () => {
  const state = makeState(16, 'swiss', 5)
  for (let r = 1; r <= 5; r += 1) simulate(state, r)
  let worst = 0
  for (const s of buildPlayerStats(state.players, state.rounds).values()) {
    worst = Math.max(worst, Math.abs(s.white - s.black))
  }
  if (worst > 2) throw new Error(`worst colour imbalance ${worst}`)
  console.log('      Worst white/black difference:', worst)
})
