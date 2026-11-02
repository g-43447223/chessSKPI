import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DEFAULT_RATING, isResult } from '../lib/constants'
import { buildDemoState } from '../lib/demo'
import { t } from '../lib/i18n'
import { generatePairings } from '../lib/pairings'
import { computeStandings } from '../lib/stats'
import {
  createEmptyState,
  loadState,
  normalizeState,
  saveState,
  storageSize,
} from '../lib/storage'
import { uid } from '../lib/utils'

const TournamentContext = createContext(null)

let toastSequence = 0

export function TournamentProvider({ children }) {
  const [state, setState] = useState(() => loadState())
  const [toasts, setToasts] = useState([])
  const [savedAt, setSavedAt] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const stateRef = useRef(state)
  const timers = useRef(new Map())

  const apply = useCallback((next) => {
    stateRef.current = next
    setState(next)
  }, [])

  const commit = useCallback((updater) => {
    const next = updater(stateRef.current)
    stateRef.current = next
    setState(next)
    return next
  }, [])

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'success') => {
      const id = `toast_${(toastSequence += 1)}`
      setToasts((current) => [...current.slice(-3), { id, message, tone }])
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
        timers.current.delete(id)
      }, 4600)
      timers.current.set(id, timer)
    },
    [],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveState(state)
      if (result.ok) {
        setSavedAt(new Date())
        setSaveError(null)
      } else {
        setSaveError(result.error)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [state])

  useEffect(() => {
    const activeTimers = timers.current
    return () => activeTimers.forEach((timer) => clearTimeout(timer))
  }, [])

  const addPlayers = useCallback(
    (rows) => {
      const clean = rows
        .map((row) => ({
          name: String(row.name ?? '').replace(/\s+/g, ' ').trim(),
          grade: String(row.grade ?? '').trim(),
          rating: Math.max(
            0,
            Math.min(
              3000,
              Math.round(Number(row.rating) || DEFAULT_RATING),
            ),
          ),
        }))
        .filter((row) => row.name)

      if (!clean.length) return { ok: false, error: t('players.error.noPlayers') }

      const startSeed = stateRef.current.players.length
      const created = clean.map((row, index) => ({
        id: uid('pl'),
        name: row.name,
        grade: row.grade,
        rating: row.rating,
        status: 'active',
        absences: [],
        seed: startSeed + index + 1,
        createdAt: new Date().toISOString(),
      }))

      commit((current) => ({
        ...current,
        players: [...current.players, ...created],
      }))

      return { ok: true, players: created }
    },
    [commit],
  )

  const addPlayer = useCallback(
    (data) => addPlayers([data]),
    [addPlayers],
  )

  const updatePlayer = useCallback(
    (id, patch) => {
      let found = false
      commit((current) => ({
        ...current,
        players: current.players.map((player) => {
          if (player.id !== id) return player
          found = true
          return {
            ...player,
            ...(patch.name !== undefined
              ? { name: String(patch.name).replace(/\s+/g, ' ').trim() }
              : {}),
            ...(patch.grade !== undefined ? { grade: String(patch.grade).trim() } : {}),
            ...(patch.rating !== undefined
              ? {
                  rating: Math.max(
                    0,
                    Math.min(3000, Math.round(Number(patch.rating) || 0)),
                  ),
                }
              : {}),
          }
        }),
      }))
      return found ? { ok: true } : { ok: false, error: t('errors.player.notFound') }
    },
    [commit],
  )

  const deletePlayer = useCallback(
    (id) => {
      const current = stateRef.current
      const hasHistory = current.rounds.some((round) =>
        (round.pairings ?? []).some(
          (pairing) =>
            pairing.whiteId === id ||
            pairing.blackId === id ||
            pairing.byePlayerId === id,
        ),
      )
      if (hasHistory) {
        return {
          ok: false,
          error: t('errors.player.inRounds'),
        }
      }
      commit((store) => ({
        ...store,
        players: store.players.filter((player) => player.id !== id),
      }))
      return { ok: true }
    },
    [commit],
  )

  const setPlayerStatus = useCallback(
    (id, status) => {
      const nextStatus = status === 'withdrawn' ? 'withdrawn' : 'active'
      commit((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === id ? { ...player, status: nextStatus } : player,
        ),
      }))
    },
    [commit],
  )

  const setAbsence = useCallback(
    (id, roundNumber, absent) => {
      const current = stateRef.current
      const round = current.rounds.find((item) => item.number === roundNumber)
      if (round?.status === 'locked') {
        return { ok: false, error: t('errors.attendance.locked') }
      }

      commit((store) => ({
        ...store,
        players: store.players.map((player) => {
          if (player.id !== id) return player
          const absences = new Set(player.absences ?? [])
          if (absent) absences.add(roundNumber)
          else absences.delete(roundNumber)
          return { ...player, absences: [...absences].sort((a, b) => a - b) }
        }),
      }))
      return { ok: true }
    },
    [commit],
  )

  const updateTournament = useCallback(
    (patch) => {
      const current = stateRef.current
      const roundsLocked = current.rounds.length
      const next = { ...current.tournament, ...patch }

      if (patch.format && patch.format !== current.tournament.format) {
        if (current.rounds.length > 0) {
          return {
            ok: false,
            error: t('errors.tournament.formatLocked'),
          }
        }
      }
      const total = Math.round(Number(next.totalRounds) || 1)
      if (total < Math.max(1, roundsLocked)) {
        return {
          ok: false,
          error: t('errors.tournament.minRounds', { count: roundsLocked }),
        }
      }
      next.totalRounds = total
      if (!String(next.name ?? '').trim()) next.name = t('app.defaultTournamentName')

      commit((store) => ({ ...store, tournament: next }))
      return { ok: true }
    },
    [commit],
  )

  const updateSettings = useCallback(
    (patch) => {
      commit((store) => ({
        ...store,
        settings: { ...store.settings, ...patch },
      }))
      return { ok: true }
    },
    [commit],
  )

  const generateNextRound = useCallback(() => {
    const current = stateRef.current
    const number = current.rounds.length + 1
    const result = generatePairings(current, number)
    if (result.error) return { ok: false, error: result.error }

    const round = {
      id: uid('round'),
      number,
      status: 'draft',
      createdAt: new Date().toISOString(),
      lockedAt: null,
      pairings: result.pairings,
    }
    commit((store) => ({ ...store, rounds: [...store.rounds, round] }))
    return { ok: true, round, warnings: result.warnings }
  }, [commit])

  const regenerateRound = useCallback(
    (roundNumber) => {
      const current = stateRef.current
      const existing = current.rounds.find((round) => round.number === roundNumber)
      if (!existing) return { ok: false, error: t('errors.round.notFound') }
      if (existing.status === 'locked') {
        return { ok: false, error: t('errors.round.regenerateLocked') }
      }

      const base = {
        ...current,
        rounds: current.rounds.filter((round) => round.number < roundNumber),
      }
      const result = generatePairings(base, roundNumber)
      if (result.error) return { ok: false, error: result.error }

      commit((store) => ({
        ...store,
        rounds: store.rounds.map((round) =>
          round.number === roundNumber
            ? { ...round, pairings: result.pairings, status: 'draft' }
            : round,
        ),
      }))
      return { ok: true, warnings: result.warnings, discarded: existing.pairings.length }
    },
    [commit],
  )

  const updateResult = useCallback(
    (roundNumber, pairingId, result) => {
      const current = stateRef.current
      const round = current.rounds.find((item) => item.number === roundNumber)
      if (!round) return { ok: false, error: t('errors.round.notFound') }
      if (round.status === 'locked') {
        return { ok: false, error: t('errors.round.lockedEdit') }
      }
      if (result !== null && !isResult(result)) {
        return { ok: false, error: t('errors.result.unknown') }
      }

      commit((store) => ({
        ...store,
        rounds: store.rounds.map((item) => {
          if (item.number !== roundNumber) return item
          return {
            ...item,
            pairings: item.pairings.map((pairing) =>
              pairing.id === pairingId && !pairing.byePlayerId
                ? { ...pairing, result }
                : pairing,
            ),
          }
        }),
      }))
      return { ok: true }
    },
    [commit],
  )

  const lockRound = useCallback(
    (roundNumber, options = {}) => {
      const current = stateRef.current
      const round = current.rounds.find((item) => item.number === roundNumber)
      if (!round) return { ok: false, error: t('errors.round.notFound') }
      if (round.status === 'locked') return { ok: false, error: t('errors.round.alreadyLocked') }

      const unreported = round.pairings.filter(
        (pairing) => !pairing.byePlayerId && !pairing.result,
      )
      if (unreported.length && !options.force) {
        return {
          ok: false,
          needsConfirmation: true,
          remaining: unreported.length,
          error: t('errors.round.missingResults', { count: unreported.length }),
        }
      }

      commit((store) => ({
        ...store,
        rounds: store.rounds.map((item) =>
          item.number === roundNumber
            ? { ...item, status: 'locked', lockedAt: new Date().toISOString() }
            : item,
        ),
      }))
      return { ok: true, unreported: unreported.length }
    },
    [commit],
  )

  const reopenRound = useCallback(
    (roundNumber) => {
      const current = stateRef.current
      const round = current.rounds.find((item) => item.number === roundNumber)
      if (!round) return { ok: false, error: t('errors.round.notFound') }
      if (round.status !== 'locked') return { ok: false, error: t('errors.round.alreadyOpen') }
      if (round.number !== current.rounds.length) {
        return {
          ok: false,
          error: t('errors.round.onlyLatestReopen'),
        }
      }
      if (round.number < current.rounds.length) {
        return { ok: false, error: t('errors.round.onlyLatestReopenShort') }
      }

      commit((store) => ({
        ...store,
        rounds: store.rounds.map((item) =>
          item.number === roundNumber
            ? { ...item, status: 'draft', lockedAt: null }
            : item,
        ),
      }))
      return { ok: true }
    },
    [commit],
  )

  const deleteRound = useCallback(
    (roundNumber) => {
      const current = stateRef.current
      const round = current.rounds.find((item) => item.number === roundNumber)
      if (!round) return { ok: false, error: t('errors.round.notFound') }
      if (round.number !== current.rounds.length) {
        return { ok: false, error: t('errors.round.onlyLatestDelete') }
      }
      if (round.status === 'locked') {
        return { ok: false, error: t('errors.round.reopenBeforeDelete') }
      }
      commit((store) => ({
        ...store,
        rounds: store.rounds.filter((item) => item.number !== roundNumber),
      }))
      return { ok: true }
    },
    [commit],
  )

  const resetAll = useCallback(() => {
    const next = createEmptyState()
    apply(next)
    return { ok: true }
  }, [apply])

  const importState = useCallback(
    (raw) => {
      try {
        const normalized = normalizeState(raw)
        apply(normalized)
        return { ok: true, state: normalized }
      } catch (error) {
        return { ok: false, error: error.message || t('errors.import.unreadable') }
      }
    },
    [apply],
  )

  const loadDemo = useCallback(() => {
    const demo = buildDemoState()
    apply(demo)
    return { ok: true }
  }, [apply])

  const standings = useMemo(
    () => computeStandings(state.players, state.rounds),
    [state.players, state.rounds],
  )

  const activePlayers = useMemo(
    () => state.players.filter((player) => player.status !== 'withdrawn'),
    [state.players],
  )

  const value = useMemo(
    () => ({
      state,
      tournament: state.tournament,
      players: state.players,
      rounds: state.rounds,
      settings: state.settings,
      standings,
      activePlayers,
      toasts,
      savedAt,
      saveError,
      notify,
      dismissToast,
      addPlayer,
      addPlayers,
      updatePlayer,
      deletePlayer,
      setPlayerStatus,
      setAbsence,
      updateTournament,
      updateSettings,
      generateNextRound,
      regenerateRound,
      updateResult,
      lockRound,
      reopenRound,
      deleteRound,
      resetAll,
      importState,
      loadDemo,
      getStorageSize: () => storageSize(stateRef.current),
    }),
    [
      state,
      standings,
      activePlayers,
      toasts,
      savedAt,
      saveError,
      notify,
      dismissToast,
      addPlayer,
      addPlayers,
      updatePlayer,
      deletePlayer,
      setPlayerStatus,
      setAbsence,
      updateTournament,
      updateSettings,
      generateNextRound,
      regenerateRound,
      updateResult,
      lockRound,
      reopenRound,
      deleteRound,
      resetAll,
      importState,
      loadDemo,
    ],
  )

  return (
    <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
  )
}

export function useTournament() {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error('useTournament must be used inside TournamentProvider')
  }
  return context
}
