import { resultPoints } from './constants.js'
import { round2, sum } from './utils.js'

function emptyStats(id) {
  return {
    id,
    points: 0,
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    white: 0,
    black: 0,
    colorHistory: [],
    gamesDetail: [],
    opponents: [],
  }
}

/**
 * Aggregate every reported game. Works on any set of rounds so the same
 * function powers live standings, tie-breakers and the pairing engine.
 */
export function buildPlayerStats(players, rounds) {
  const stats = new Map(players.map((player) => [player.id, emptyStats(player.id)]))
  const ordered = [...rounds].sort((a, b) => a.number - b.number)

  for (const round of ordered) {
    for (const pairing of round.pairings ?? []) {
      if (pairing.byePlayerId) {
        const entry = stats.get(pairing.byePlayerId)
        if (!entry) continue
        entry.points += 1
        entry.byes += 1
        entry.games += 1
        continue
      }

      if (!pairing.result || !pairing.whiteId || !pairing.blackId) continue
      const points = resultPoints(pairing.result)
      const white = stats.get(pairing.whiteId)
      const black = stats.get(pairing.blackId)
      if (!points || !white || !black) continue

      white.points += points.white
      black.points += points.black
      white.games += 1
      black.games += 1
      white.white += 1
      black.black += 1
      white.colorHistory.push('w')
      black.colorHistory.push('b')
      white.opponents.push(black.id)
      black.opponents.push(white.id)
      white.gamesDetail.push({
        opponentId: black.id,
        color: 'w',
        points: points.white,
        round: round.number,
      })
      black.gamesDetail.push({
        opponentId: white.id,
        color: 'b',
        points: points.black,
        round: round.number,
      })

      if (points.white === 1) {
        white.wins += 1
        black.losses += 1
      } else if (points.white === 0.5) {
        white.draws += 1
        black.draws += 1
      } else {
        white.losses += 1
        black.wins += 1
      }
    }
  }

  return stats
}

export function computeStandings(players, rounds) {
  const stats = buildPlayerStats(players, rounds)
  const rows = players.map((player) => {
    const entry = stats.get(player.id) ?? emptyStats(player.id)
    const opponentScores = entry.opponents.map(
      (opponentId) => stats.get(opponentId)?.points ?? 0,
    )
    const buchholz = round2(sum(opponentScores))
    const buchholzCut1 = opponentScores.length
      ? round2(buchholz - Math.min(...opponentScores))
      : 0
    const sonnebornBerger = round2(
      entry.gamesDetail.reduce((total, game) => {
        const opponentPoints = stats.get(game.opponentId)?.points ?? 0
        return total + game.points * opponentPoints
      }, 0),
    )

    return {
      id: player.id,
      name: player.name,
      grade: player.grade || '',
      rating: player.rating ?? 0,
      status: player.status ?? 'active',
      points: round2(entry.points),
      games: entry.games,
      wins: entry.wins,
      draws: entry.draws,
      losses: entry.losses,
      byes: entry.byes,
      white: entry.white,
      black: entry.black,
      buchholz,
      buchholzCut1,
      sonnebornBerger,
      directEncounter: 0,
      rank: 0,
      gamesDetail: entry.gamesDetail,
    }
  })

  // Direct Encounter: score against players on the same total, only after
  // the games have been reported. It breaks ties without inventing results.
  for (const row of rows) {
    row.directEncounter = round2(
      row.gamesDetail.reduce((total, game) => {
        const opponent = rows.find((candidate) => candidate.id === game.opponentId)
        if (!opponent || opponent.points !== row.points) return total
        return total + game.points
      }, 0),
    )
  }

  rows.sort(compareStandings)

  let previous = null
  let rank = 0
  rows.forEach((row, index) => {
    if (!previous || !sameRank(previous, row)) rank = index + 1
    row.rank = rank
    previous = row
  })

  return rows
}

export function compareStandings(a, b) {
  return (
    b.points - a.points ||
    b.buchholzCut1 - a.buchholzCut1 ||
    b.directEncounter - a.directEncounter ||
    b.sonnebornBerger - a.sonnebornBerger ||
    b.wins - a.wins ||
    b.rating - a.rating ||
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  )
}

export function sameRank(a, b) {
  return (
    a.points === b.points &&
    a.buchholzCut1 === b.buchholzCut1 &&
    a.directEncounter === b.directEncounter &&
    a.sonnebornBerger === b.sonnebornBerger &&
    a.wins === b.wins
  )
}

export function roundProgress(round) {
  const pairings = round?.pairings ?? []
  const total = pairings.length
  const reported = pairings.filter((pairing) => pairing.byePlayerId || pairing.result).length
  return {
    total,
    reported,
    remaining: total - reported,
    complete: total > 0 && reported === total,
    percent: total ? Math.round((reported / total) * 100) : 0,
  }
}

export function suggestSwissRounds(playerCount) {
  if (playerCount < 2) return 1
  return Math.max(1, Math.ceil(Math.log2(playerCount)))
}

export function suggestRoundRobinRounds(playerCount) {
  if (playerCount < 2) return 1
  return playerCount % 2 === 0 ? playerCount - 1 : playerCount
}
