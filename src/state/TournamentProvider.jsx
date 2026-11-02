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
import { buildPlayerStats, computeStandings } from '../lib/stats'
import {
  createEmptyState,
  loadState,
  loadTournamentsBundle,
  normalizeState,
  normalizeBundle,
  saveTournamentsBundle,
  storageSize,
} from '../lib/storage'
import { round2, uid } from '../lib/utils'
import {
  clearRemoteVersion,
  fetchRemoteState,
  getRemoteVersion,
  getSyncConfig,
  pushRemoteState,
  setRemoteVersion,
  setSyncConfig,
} from '../lib/sheets'

const TournamentContext = createContext(null)

let toastSequence = 0

export function TournamentProvider({ children }) {
  const initialBundle = loadTournamentsBundle()
  const [bundle, setBundle] = useState(initialBundle)
  const [state, setState] = useState(() => {
    const active =
      initialBundle.tournaments.find((item) => item.id === initialBundle.activeId) ||
      initialBundle.tournaments[0]
    return active.state
  })
  const [toasts, setToasts] = useState([])
  const [savedAt, setSavedAt] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [syncConfig, setSyncConfigState] = useState(() => getSyncConfig())

  const stateRef = useRef(state)
  const bundleRef = useRef(initialBundle)
  const timers = useRef(new Map())
  const remoteVersionRef = useRef(getRemoteVersion())
  const readyRef = useRef(false)
  const pushTimerRef = useRef(null)

  const apply = useCallback((next) => {
    stateRef.current = next
    setState(next)
    setBundle((prev) => {
      const updated = {
        ...prev,
        tournaments: prev.tournaments.map((item) =>
          item.id === prev.activeId
            ? { ...item, state: next, name: next.tournament?.name || item.name }
            : item,
        ),
      }
      bundleRef.current = updated
      return updated
    })
  }, [])

  const commit = useCallback((updater) => {
    const next = updater(stateRef.current)
    stateRef.current = next
    setState(next)
    setBundle((prev) => {
      const updated = {
        ...prev,
        tournaments: prev.tournaments.map((item) =>
          item.id === prev.activeId
            ? { ...item, state: next, name: next.tournament?.name || item.name }
            : item,
        ),
      }
      bundleRef.current = updated
      return updated
    })
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
      const result = saveTournamentsBundle(bundleRef.current)
      if (result.ok) {
        setSavedAt(new Date())
        setSaveError(null)
      } else {
        setSaveError(result.error)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [bundle])

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

  const addTeam = useCallback((name) => {
    const clean = String(name ?? '').replace(/\s+/g, ' ').trim()
    if (!clean) return { ok: false, error: t('teams.form.name') }
    if (stateRef.current.teams.some((team) => team.name.toLowerCase() === clean.toLowerCase())) {
      return { ok: false, error: t('errors.team.duplicate') }
    }
    commit((store) => ({
      ...store,
      teams: [...store.teams, { id: uid('team'), name: clean, createdAt: new Date().toISOString() }],
    }))
    return { ok: true }
  }, [commit])

  const updateTeam = useCallback((id, patch) => {
    let found = false
    commit((store) => ({
      ...store,
      teams: store.teams.map((team) => {
        if (team.id !== id) return team
        found = true
        return {
          ...team,
          ...(patch.name !== undefined ? { name: String(patch.name).replace(/\s+/g, ' ').trim() } : {}),
        }
      }),
    }))
    return found ? { ok: true } : { ok: false, error: t('errors.team.notFound') }
  }, [commit])

  const deleteTeam = useCallback((id) => {
    const current = stateRef.current
    if (current.players.some((player) => player.teamId === id)) {
      return { ok: false, error: t('errors.team.hasPlayers') }
    }
    if (
      current.teamRounds.some((round) =>
        (round.pairings ?? []).some(
          (pairing) =>
            pairing.whiteId === id || pairing.blackId === id || pairing.byePlayerId === id,
        ),
      )
    ) {
      return { ok: false, error: t('errors.team.inRounds') }
    }
    commit((store) => ({ ...store, teams: store.teams.filter((team) => team.id !== id) }))
    return { ok: true }
  }, [commit])

  const assignPlayerTeam = useCallback((playerId, teamId, contributes = true) => {
    commit((store) => ({
      ...store,
      players: store.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              teamId: teamId || null,
              contributesToTeam: teamId ? contributes !== false : false,
            }
          : player,
      ),
    }))
    return { ok: true }
  }, [commit])

  const generateNextTeamRound = useCallback(() => {
    const current = stateRef.current
    const number = current.teamRounds.length + 1
    const base = { ...current, players: current.teams, rounds: current.teamRounds }
    const result = generatePairings(base, number)
    if (result.error) return { ok: false, error: result.error }
    const round = {
      id: uid('round'),
      number,
      status: 'draft',
      createdAt: new Date().toISOString(),
      lockedAt: null,
      pairings: result.pairings,
    }
    commit((store) => ({ ...store, teamRounds: [...store.teamRounds, round] }))
    return { ok: true, round, warnings: result.warnings }
  }, [commit])

  const regenerateTeamRound = useCallback((roundNumber) => {
    const current = stateRef.current
    const existing = current.teamRounds.find((round) => round.number === roundNumber)
    if (!existing) return { ok: false, error: t('errors.round.notFound') }
    if (existing.status === 'locked') return { ok: false, error: t('errors.round.regenerateLocked') }
    const base = {
      ...current,
      players: current.teams,
      rounds: current.teamRounds.filter((round) => round.number < roundNumber),
    }
    const result = generatePairings(base, roundNumber)
    if (result.error) return { ok: false, error: result.error }
    commit((store) => ({
      ...store,
      teamRounds: store.teamRounds.map((round) =>
        round.number === roundNumber
          ? { ...round, pairings: result.pairings, status: 'draft' }
          : round,
      ),
    }))
    return { ok: true, warnings: result.warnings, discarded: existing.pairings.length }
  }, [commit])

  const updateTeamResult = useCallback((roundNumber, pairingId, result) => {
    const current = stateRef.current
    const round = current.teamRounds.find((item) => item.number === roundNumber)
    if (!round) return { ok: false, error: t('errors.round.notFound') }
    if (round.status === 'locked') return { ok: false, error: t('errors.round.lockedEdit') }
    if (result !== null && !isResult(result)) return { ok: false, error: t('errors.result.unknown') }
    commit((store) => ({
      ...store,
      teamRounds: store.teamRounds.map((item) => {
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
  }, [commit])

  const lockTeamRound = useCallback((roundNumber, options = {}) => {
    const current = stateRef.current
    const round = current.teamRounds.find((item) => item.number === roundNumber)
    if (!round) return { ok: false, error: t('errors.round.notFound') }
    if (round.status === 'locked') return { ok: false, error: t('errors.round.alreadyLocked') }
    const unreported = round.pairings.filter((pairing) => !pairing.byePlayerId && !pairing.result)
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
      teamRounds: store.teamRounds.map((item) =>
        item.number === roundNumber
          ? { ...item, status: 'locked', lockedAt: new Date().toISOString() }
          : item,
      ),
    }))
    return { ok: true, unreported: unreported.length }
  }, [commit])

  const reopenTeamRound = useCallback((roundNumber) => {
    const current = stateRef.current
    const round = current.teamRounds.find((item) => item.number === roundNumber)
    if (!round) return { ok: false, error: t('errors.round.notFound') }
    if (round.status !== 'locked') return { ok: false, error: t('errors.round.alreadyOpen') }
    if (round.number !== current.teamRounds.length) {
      return { ok: false, error: t('errors.round.onlyLatestReopen') }
    }
    commit((store) => ({
      ...store,
      teamRounds: store.teamRounds.map((item) =>
        item.number === roundNumber
          ? { ...item, status: 'draft', lockedAt: null }
          : item,
      ),
    }))
    return { ok: true }
  }, [commit])

  const deleteTeamRound = useCallback((roundNumber) => {
    const current = stateRef.current
    const round = current.teamRounds.find((item) => item.number === roundNumber)
    if (!round) return { ok: false, error: t('errors.round.notFound') }
    if (round.number !== current.teamRounds.length) {
      return { ok: false, error: t('errors.round.onlyLatestDelete') }
    }
    if (round.status === 'locked') {
      return { ok: false, error: t('errors.round.reopenBeforeDelete') }
    }
    commit((store) => ({
      ...store,
      teamRounds: store.teamRounds.filter((item) => item.number !== roundNumber),
    }))
    return { ok: true }
  }, [commit])

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

  const tournaments = bundle.tournaments.map((item) => ({ id: item.id, name: item.name }))
  const activeId = bundle.activeId

  const switchTournament = useCallback((id) => {
    const entry = bundleRef.current.tournaments.find((item) => item.id === id)
    if (!entry) return { ok: false, error: t('errors.tournament.notFound') }
    stateRef.current = entry.state
    setState(entry.state)
    setBundle((prev) => {
      const updated = { ...prev, activeId: id }
      bundleRef.current = updated
      return updated
    })
    return { ok: true }
  }, [])

  const createTournament = useCallback((name) => {
    const state = createEmptyState()
    if (name && String(name).trim()) {
      state.tournament.name = String(name).trim()
    }
    const id = uid('t')
    const entry = { id, name: state.tournament.name, state }
    setBundle((prev) => {
      const updated = {
        ...prev,
        activeId: id,
        tournaments: [...prev.tournaments, entry],
      }
      bundleRef.current = updated
      return updated
    })
    stateRef.current = state
    setState(state)
    return { ok: true, id }
  }, [])

  const deleteTournament = useCallback((id) => {
    if (bundleRef.current.tournaments.length <= 1) {
      return { ok: false, error: t('errors.tournament.cannotDeleteLast') }
    }
    const remaining = bundleRef.current.tournaments.filter((item) => item.id !== id)
    if (!remaining.length) {
      return { ok: false, error: t('errors.tournament.cannotDeleteLast') }
    }
    const nextActive =
      bundleRef.current.activeId === id ? remaining[0].id : bundleRef.current.activeId
    const nextActiveState =
      remaining.find((item) => item.id === nextActive)?.state || remaining[0].state
    setBundle((prev) => {
      const updated = {
        ...prev,
        activeId: nextActive,
        tournaments: remaining,
      }
      bundleRef.current = updated
      return updated
    })
    stateRef.current = nextActiveState
    setState(nextActiveState)
    return { ok: true }
  }, [])

  const renameTournament = useCallback((id, name) => {
    const clean = String(name ?? '').trim()
    if (!clean) return { ok: false, error: t('errors.tournament.nameRequired') }
    setBundle((prev) => {
      const updated = {
        ...prev,
        tournaments: prev.tournaments.map((item) =>
          item.id === id
            ? {
                ...item,
                name: clean,
                state:
                  item.id === prev.activeId
                    ? { ...item.state, tournament: { ...item.state.tournament, name: clean } }
                    : item.state,
              }
            : item,
        ),
      }
      bundleRef.current = updated
      return updated
    })
    if (id === bundleRef.current.activeId) {
      setState((prev) => ({ ...prev, tournament: { ...prev.tournament, name: clean } }))
      stateRef.current = { ...stateRef.current, tournament: { ...stateRef.current.tournament, name: clean } }
    }
    return { ok: true }
  }, [])

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

  const updateSyncConfig = useCallback((config) => {
    setSyncConfig(config)
    const next = getSyncConfig()
    setSyncConfigState(next)
    remoteVersionRef.current = getRemoteVersion()
    setSyncStatus(next.url && next.token ? 'idle' : 'idle')
    return { ok: true }
  }, [])

  const syncNow = useCallback(async () => {
    const config = getSyncConfig()
    if (!config.url || !config.token) {
      setSyncStatus('idle')
      return { ok: false, error: 'missing_config' }
    }
    setSyncStatus('syncing')
    const remote = await fetchRemoteState(config)
    if (!remote.ok) {
      setSyncStatus('error')
      return remote
    }
    if (remote.state && remote.version > remoteVersionRef.current) {
      try {
        apply(normalizeState(remote.state))
      } catch (error) {
        setSyncStatus('error')
        return { ok: false, error: error.message }
      }
    }
    remoteVersionRef.current = remote.version || remoteVersionRef.current
    setRemoteVersion(remoteVersionRef.current)

    const push = await pushRemoteState(config, stateRef.current, remoteVersionRef.current)
    if (push.conflict) {
      try {
        apply(normalizeState(push.state))
      } catch {
        /* ignore */
      }
      remoteVersionRef.current = push.version || remoteVersionRef.current
      setRemoteVersion(remoteVersionRef.current)
      setSyncStatus('synced')
      return { ok: true, conflict: true }
    }
    if (!push.ok) {
      setSyncStatus('error')
      return push
    }
    remoteVersionRef.current = push.version || remoteVersionRef.current
    setRemoteVersion(remoteVersionRef.current)
    setSyncStatus('synced')
    return { ok: true }
  }, [apply])

  useEffect(() => {
    const config = getSyncConfig()
    if (!config.url || !config.token) {
      readyRef.current = true
      return
    }
    let cancelled = false
    setSyncStatus('syncing')
    fetchRemoteState(config)
      .then((remote) => {
        if (cancelled) return
        if (remote.ok && remote.state) {
          if (remote.version > remoteVersionRef.current) {
            try {
              apply(normalizeState(remote.state))
            } catch {
              /* ignore */
            }
          }
          remoteVersionRef.current = remote.version || remoteVersionRef.current
          setRemoteVersion(remoteVersionRef.current)
        }
        setSyncStatus(remote.ok ? 'synced' : 'error')
        readyRef.current = true
      })
      .catch(() => {
        if (cancelled) return
        setSyncStatus('error')
        readyRef.current = true
      })
    return () => {
      cancelled = true
    }
  }, [apply])

  useEffect(() => {
    if (!readyRef.current) return
    const config = getSyncConfig()
    if (!config.url || !config.token) return
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      setSyncStatus('syncing')
      pushRemoteState(config, stateRef.current, remoteVersionRef.current)
        .then((push) => {
          if (push.conflict) {
            try {
              apply(normalizeState(push.state))
            } catch {
              /* ignore */
            }
            remoteVersionRef.current = push.version || remoteVersionRef.current
            setRemoteVersion(remoteVersionRef.current)
            setSyncStatus('synced')
            return
          }
          if (!push.ok) {
            setSyncStatus('error')
            return
          }
          remoteVersionRef.current = push.version || remoteVersionRef.current
          setRemoteVersion(remoteVersionRef.current)
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('error'))
    }, 1500)
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [state])

  const standings = useMemo(
    () => computeStandings(state.players, state.rounds),
    [state.players, state.rounds],
  )

  const teamStandings = useMemo(
    () => computeStandings(state.teams, state.teamRounds),
    [state.teams, state.teamRounds],
  )

  const teamAggregateStandings = useMemo(() => {
    const stats = buildPlayerStats(state.players, state.rounds)
    const rows = state.teams.map((team) => {
      const members = state.players.filter(
        (player) => player.teamId === team.id && player.contributesToTeam,
      )
      let points = 0
      let games = 0
      let wins = 0
      let draws = 0
      let losses = 0
      let byes = 0
      for (const member of members) {
        const entry = stats.get(member.id)
        if (!entry) continue
        points += entry.points
        games += entry.games
        wins += entry.wins
        draws += entry.draws
        losses += entry.losses
        byes += entry.byes
      }
      return {
        id: team.id,
        name: team.name,
        memberCount: members.length,
        points: round2(points),
        games,
        wins,
        draws,
        losses,
        byes,
        rank: 0,
      }
    })
    rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    let previous = null
    let rank = 0
    rows.forEach((row, index) => {
      if (!previous || previous.points !== row.points) rank = index + 1
      row.rank = rank
      previous = row
    })
    return rows
  }, [state.teams, state.players, state.rounds])

  const activePlayers = useMemo(
    () => state.players.filter((player) => player.status !== 'withdrawn'),
    [state.players],
  )

  const value = useMemo(
    () => ({
      state,
      tournament: state.tournament,
      tournaments,
      activeId,
      players: state.players,
      teams: state.teams,
      rounds: state.rounds,
      teamRounds: state.teamRounds,
      settings: state.settings,
      standings,
      teamStandings,
      teamAggregateStandings,
      activePlayers,
      toasts,
      savedAt,
      saveError,
      syncStatus,
      syncConfig,
      updateSyncConfig,
      syncNow,
      notify,
      dismissToast,
      addPlayer,
      addPlayers,
      updatePlayer,
      deletePlayer,
      setPlayerStatus,
      setAbsence,
      assignPlayerTeam,
      addTeam,
      updateTeam,
      deleteTeam,
      generateNextTeamRound,
      regenerateTeamRound,
      updateTeamResult,
      lockTeamRound,
      reopenTeamRound,
      deleteTeamRound,
      switchTournament,
      createTournament,
      deleteTournament,
      renameTournament,
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
      teamStandings,
      teamAggregateStandings,
      activePlayers,
      toasts,
      savedAt,
      saveError,
      syncStatus,
      syncConfig,
      updateSyncConfig,
      syncNow,
      notify,
      dismissToast,
      addPlayer,
      addPlayers,
      updatePlayer,
      deletePlayer,
      setPlayerStatus,
      setAbsence,
      assignPlayerTeam,
      addTeam,
      updateTeam,
      deleteTeam,
      generateNextTeamRound,
      regenerateTeamRound,
      updateTeamResult,
      lockTeamRound,
      reopenTeamRound,
      deleteTeamRound,
      switchTournament,
      createTournament,
      deleteTournament,
      renameTournament,
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
