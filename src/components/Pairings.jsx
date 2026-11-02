import { useEffect, useMemo, useState } from 'react'
import { RESULT_OPTIONS } from '../lib/constants'
import { pairingsAreStale } from '../lib/pairings'
import { roundProgress } from '../lib/stats'
import { cn, formatPoints } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  InfoNote,
  Modal,
  ProgressBar,
} from './ui'

function StatusPill({ round, t }) {
  if (!round) return <Badge tone="slate">{t('pairings.status.notPaired')}</Badge>
  return round.status === 'locked' ? (
    <Badge tone="emerald" dot>
      {t('pairings.status.locked')}
    </Badge>
  ) : (
    <Badge tone="amber" dot>
      {t('pairings.status.scoring')}
    </Badge>
  )
}

function ColorSquare({ color, t }) {
  return (
    <span
      className={cn(
        'inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] shadow-sm',
        color === 'white'
          ? 'border border-slate-300 bg-white'
          : 'border border-slate-900 bg-slate-900',
      )}
      title={color === 'white' ? t('pairings.color.white') : t('pairings.color.black')}
      aria-label={color === 'white' ? t('pairings.color.whitePiece') : t('pairings.color.blackPiece')}
    />
  )
}

function ResultSelector({ pairing, disabled, onChange, compact = false, t }) {
  const active = pairing.result
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100/80 p-0.5',
        compact ? 'w-full' : '',
      )}
      role="group"
      aria-label={t('pairings.result.aria', { board: pairing.board })}
    >
      {RESULT_OPTIONS.map((option) => {
        const selected = active === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            title={
              option.value === '1-0'
                ? t('pairings.result.whiteWins')
                : option.value === '0.5-0.5'
                  ? t('pairings.result.draw')
                  : t('pairings.result.blackWins')
            }
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              'tabular rounded-[9px] px-2.5 py-1.5 text-[12px] font-bold whitespace-nowrap transition-colors sm:px-3',
              compact && 'flex-1 px-4',
              selected
                ? option.value === '1-0'
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-300'
                  : option.value === '0-1'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-white hover:text-slate-800',
              disabled && 'cursor-default opacity-80',
            )}
          >
            {option.label}
          </button>
        )
      })}
      {active && !disabled ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label={t('pairings.result.clear')}
          title={t('pairings.result.clear')}
        >
          <Icon name="x" size={12} />
        </button>
      ) : null}
    </div>
  )
}

function PlayerCell({ player, color, points, align = 'left', t }) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5',
        align === 'right' ? 'sm:flex-row-reverse sm:text-right' : '',
      )}
    >
      <ColorSquare color={color} t={t} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-800 sm:text-sm">
          {player?.name ?? t('common.unknownPlayer')}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">
          {player?.grade || t('common.noClass')}
          {player?.rating ? ` · ${player.rating}` : ''}
          <span className="mx-1 text-slate-300">·</span>
          <span className="font-semibold text-slate-500">{t('pairings.player.points', { points: formatPoints(points) })}</span>
        </p>
      </div>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-slate-500 uppercase sm:hidden">
        {color === 'white' ? t('pairings.color.white') : t('pairings.color.black')}
      </span>
    </div>
  )
}

function PairingRow({ pairing, playersById, standingsById, locked, onChangeResult, t }) {
  if (pairing.byePlayerId) {
    const player = playersById.get(pairing.byePlayerId)
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-[9px] font-black tracking-wide text-amber-800">
          BYE
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-800 sm:text-sm">
            {player?.name ?? t('common.unknownPlayer')}
          </p>
          <p className="text-[11px] text-slate-400">
            {player?.grade || t('common.noClass')} · {t('pairings.bye.noOpponent')}
          </p>
        </div>
        <Badge tone="emerald">{t('pairings.bye.points')}</Badge>
      </div>
    )
  }

  const white = playersById.get(pairing.whiteId)
  const black = playersById.get(pairing.blackId)
  const whitePoints = standingsById.get(pairing.whiteId)?.points ?? 0
  const blackPoints = standingsById.get(pairing.blackId)?.points ?? 0

  return (
    <div className="px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="grid items-center gap-2 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
        <div className="flex items-center justify-between gap-2 sm:block">
          <div className="flex items-center gap-2">
            <span className="tabular flex h-8 w-9 items-center justify-center rounded-lg bg-slate-100 text-[12px] font-black text-slate-600">
              {pairing.board}
            </span>
            <span className="text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase sm:hidden">
              {t('pairings.board.label', { board: pairing.board })}
            </span>
          </div>
          <span className="sm:hidden">
            {pairing.result ? (
              <Badge tone="slate">{pairing.result.replace('0.5-0.5', '½–½')}</Badge>
            ) : (
              <Badge tone="amber">{t('pairings.board.unreported')}</Badge>
            )}
          </span>
        </div>

        <PlayerCell player={white} color="white" points={whitePoints} align="right" t={t} />

        <div className="hidden sm:block">
          <ResultSelector
            pairing={pairing}
            disabled={locked}
            onChange={(result) => onChangeResult(pairing.id, result)}
            t={t}
          />
        </div>

        <PlayerCell player={black} color="black" points={blackPoints} t={t} />

        <div className="mt-1 sm:hidden">
          <ResultSelector
            compact
            pairing={pairing}
            disabled={locked}
            onChange={(result) => onChangeResult(pairing.id, result)}
            t={t}
          />
        </div>
      </div>
    </div>
  )
}

function AttendanceModal({ open, onClose, roundNumber, onRegenerate, canRegenerate }) {
  const { t } = useLanguage()
  const { players, setAbsence, notify } = useTournament()
  const [filter, setFilter] = useState('')

  const active = players.filter((player) => player.status !== 'withdrawn')
  const withdrawn = players.filter((player) => player.status === 'withdrawn')
  const needle = filter.trim().toLowerCase()
  const visible = active.filter(
    (player) =>
      !needle ||
      player.name.toLowerCase().includes(needle) ||
      (player.grade ?? '').toLowerCase().includes(needle),
  )
  const present = active.filter(
    (player) => !(player.absences ?? []).includes(roundNumber),
  )
  const absent = active.length - present.length

  const toggle = (player, isPresent) => {
    const result = setAbsence(player.id, roundNumber, !isPresent)
    if (!result.ok) notify(result.error, 'error')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pairings.attendance.title', { round: roundNumber })}
      description={t('pairings.attendance.description')}
      icon="users"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('pairings.attendance.done')}
          </Button>
          {canRegenerate ? (
            <Button icon="refresh" onClick={() => onRegenerate()}>
              {t('pairings.attendance.regenerate')}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 ring-inset">
            <p className="tabular text-xl font-black text-slate-900">{active.length}</p>
            <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{t('common.active')}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-200 ring-inset">
            <p className="tabular text-xl font-black text-emerald-700">{present.length}</p>
            <p className="text-[10px] font-bold tracking-wide text-emerald-600 uppercase">{t('pairings.attendance.playing')}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-200 ring-inset">
            <p className="tabular text-xl font-black text-amber-700">{absent}</p>
            <p className="text-[10px] font-bold tracking-wide text-amber-600 uppercase">{t('pairings.attendance.absent')}</p>
          </div>
        </div>

        {absent % 2 === 1 ? (
          <InfoNote tone="amber" icon="info">
            {t('pairings.attendance.odd')}
          </InfoNote>
        ) : (
          <InfoNote icon="info">
            {t('pairings.attendance.info')}
          </InfoNote>
        )}

        <Field label={t('pairings.attendance.search')}>
          <div className="relative">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('pairings.attendance.searchPlaceholder')}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:outline-none"
            />
          </div>
        </Field>

        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">{t('pairings.attendance.noMatch')}</p>
          ) : (
            visible.map((player) => {
              const isPresent = !(player.absences ?? []).includes(roundNumber)
              return (
                <div key={player.id} className="flex items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800">
                      {player.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {player.grade || t('common.noClass')} · {t('pairings.attendance.rating', { rating: player.rating })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold tracking-wide uppercase',
                      isPresent ? 'text-emerald-600' : 'text-amber-600',
                    )}
                  >
                    {isPresent ? t('pairings.attendance.playing') : t('pairings.attendance.absent')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPresent}
                    aria-label={t('pairings.attendance.playingAria', { name: player.name, round: roundNumber })}
                    onClick={() => toggle(player, isPresent)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                      isPresent ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                        isPresent ? 'translate-x-5' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {withdrawn.length ? (
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
              {t('pairings.attendance.withdrawnHeading')}
            </p>
            <div className="space-y-1">
              {withdrawn.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500"
                >
                  <span className="truncate">{player.name}</span>
                  <Badge tone="rose">{t('common.withdrawn')}</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function WarningsModal({ warnings, onClose, roundNumber }) {
  const { t } = useLanguage()
  return (
    <Modal
      open={warnings.length > 0}
      onClose={onClose}
      title={t('pairings.warnings.title', { round: roundNumber })}
      description={t('pairings.warnings.description')}
      icon="info"
      footer={<Button onClick={onClose}>{t('pairings.warnings.gotIt')}</Button>}
    >
      <ul className="space-y-2.5">
        {warnings.map((warning, index) => (
          <li
            key={index}
            className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
            <span>{warning}</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function Pairings({ onPrint }) {
  const { t } = useLanguage()
  const {
    players,
    rounds,
    tournament,
    standings,
    generateNextRound,
    regenerateRound,
    updateResult,
    lockRound,
    reopenRound,
    deleteRound,
    notify,
  } = useTournament()

  const latestRound = rounds[rounds.length - 1] ?? null
  const [selectedNumber, setSelectedNumber] = useState(
    latestRound?.number ?? 1,
  )
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [warningsFor, setWarningsFor] = useState(null)

  useEffect(() => {
    if (!rounds.length) {
      setSelectedNumber(1)
      return
    }
    if (selectedNumber > rounds.length + 1) setSelectedNumber(rounds.length)
  }, [rounds, selectedNumber])

  const selectedRound = rounds.find((round) => round.number === selectedNumber) ?? null
  const previousRound = rounds.find((round) => round.number === selectedNumber - 1) ?? null
  const previousLocked = !previousRound || previousRound.status === 'locked'
  const isNext = selectedNumber === rounds.length + 1
  const canGenerate =
    !selectedRound &&
    isNext &&
    previousLocked &&
    selectedNumber >= 1 &&
    selectedNumber <= tournament.totalRounds

  const eligible = players.filter(
    (player) =>
      player.status !== 'withdrawn' && !(player.absences ?? []).includes(selectedNumber),
  )

  const activeCount = players.filter((player) => player.status !== 'withdrawn').length
  const progress = roundProgress(selectedRound)
  const stale = selectedRound ? pairingsAreStale(players, selectedRound) : false
  const isLatest = selectedRound?.number === rounds.length
  const canLock = selectedRound && selectedRound.status === 'draft'
  const isFinalLocked =
    rounds.length >= tournament.totalRounds &&
    rounds.every((round) => round.status === 'locked')

  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const standingsById = useMemo(
    () => new Map(standings.map((row) => [row.id, row])),
    [standings],
  )

  const handleGenerate = () => {
    const result = generateNextRound()
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    setSelectedNumber(result.round.number)
    if (result.warnings?.length) {
      setWarnings(result.warnings)
      setWarningsFor(result.round.number)
    } else {
      notify(
        t('pairings.toast.paired', {
          round: result.round.number,
          boards: t('common.boardCount', { count: result.round.pairings.length }),
        }),
      )
    }
  }

  const handleRegenerate = () => {
    if (!selectedRound) return
    const result = regenerateRound(selectedRound.number)
    setRegenerateOpen(false)
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    if (result.warnings?.length) {
      setWarnings(result.warnings)
      setWarningsFor(selectedRound.number)
    } else {
      notify(t('pairings.toast.repaired', { round: selectedRound.number }))
    }
  }

  const handleLock = () => {
    if (!selectedRound) return
    const result = lockRound(selectedRound.number)
    if (result.ok) {
      notify(
        result.unreported
          ? t('pairings.toast.lockedWithMissing', {
              round: selectedRound.number,
              boards: t('common.boardCount', { count: result.unreported }),
            })
          : t('pairings.toast.locked', { round: selectedRound.number }),
        result.unreported ? 'info' : 'success',
      )
      setLockOpen(false)
      return
    }
    if (result.needsConfirmation) {
      setLockOpen(true)
      return
    }
    notify(result.error, 'error')
  }

  const forceLock = () => {
    if (!selectedRound) return
    const result = lockRound(selectedRound.number, { force: true })
    setLockOpen(false)
    if (result.ok) {
      notify(t('pairings.toast.lockedForce', { round: selectedRound.number }), 'info')
    } else {
      notify(result.error, 'error')
    }
  }

  const handleReopen = () => {
    if (!selectedRound) return
    const result = reopenRound(selectedRound.number)
    setReopenOpen(false)
    if (result.ok) notify(t('pairings.toast.reopened', { round: selectedRound.number }), 'info')
    else notify(result.error, 'error')
  }

  const handleDelete = () => {
    if (!selectedRound) return
    const result = deleteRound(selectedRound.number)
    setDeleteOpen(false)
    if (result.ok) {
      notify(t('pairings.toast.deleted', { round: selectedRound.number }))
      setSelectedNumber(Math.max(1, selectedRound.number - 1))
    } else {
      notify(result.error, 'error')
    }
  }

  // No players at all
  if (!players.length) {
    return (
      <Card>
        <EmptyState
          icon="users"
          title={t('pairings.empty.title')}
          description={t('pairings.empty.description')}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Round switcher */}
      <div className="flex items-center gap-2">
        <div className="scroll-thin flex flex-1 gap-2 overflow-x-auto pb-1">
          {Array.from({ length: tournament.totalRounds }, (_, index) => {
            const number = index + 1
            const round = rounds.find((item) => item.number === number)
            const selected = number === selectedNumber
            const isUpcoming = !round && number === rounds.length + 1
            return (
              <button
                key={number}
                type="button"
                disabled={!round && !isUpcoming}
                onClick={() => setSelectedNumber(number)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors',
                  selected
                    ? 'border-ink-900 bg-ink-900 text-white shadow-sm'
                    : round?.status === 'locked'
                      ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      : round
                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300'
                        : isUpcoming
                          ? 'border-dashed border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400'
                          : 'border-slate-200 bg-white/50 text-slate-300',
                )}
              >
                {round?.status === 'locked' ? (
                  <Icon name="check" size={13} className={selected ? 'text-emerald-300' : 'text-emerald-500'} />
                ) : round ? (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      selected ? 'bg-amber-300' : 'bg-amber-500',
                    )}
                  />
                ) : (
                  <Icon name="plus" size={13} />
                )}
                {t('pairings.roundButton', { number })}
              </button>
            )
          })}
        </div>
        {selectedRound?.pairings?.length ? (
          <Button
            variant="secondary"
            size="sm"
            icon="printer"
            onClick={() => onPrint(selectedRound.number)}
            className="hidden shrink-0 sm:inline-flex"
          >
            {t('pairings.print')}
          </Button>
        ) : null}
      </div>

      {!selectedRound && canGenerate ? (
        <>
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden bg-ink-900 px-5 py-6 text-white sm:px-7 sm:py-8">
              <div className="chess-pattern absolute inset-0 opacity-60" aria-hidden="true" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge tone="emerald" dot className="bg-emerald-400/10 text-emerald-300 ring-emerald-400/25">
                    {t('pairings.ready.title')}
                  </Badge>
                  <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                    {t('pairings.ready.round', { number: selectedNumber })}
                  </h2>
                  <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-slate-400">
                    {tournament.format === 'roundrobin'
                      ? t('pairings.ready.description.roundrobin')
                      : t('pairings.ready.description.swiss')}
                  </p>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="tabular text-2xl font-black">{eligible.length}</p>
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {t('pairings.ready.playing')}
                    </p>
                  </div>
                  <div>
                    <p className="tabular text-2xl font-black">{activeCount}</p>
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {t('pairings.ready.active')}
                    </p>
                  </div>
                  <div>
                    <p className="tabular text-2xl font-black">{eligible.length % 2}</p>
                    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {t('pairings.ready.bye')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="text-[12px] leading-relaxed text-slate-500">
                {eligible.length < 2
                  ? t('pairings.ready.needTwo')
                  : eligible.length % 2 === 1
                    ? t('pairings.ready.byeNote', {
                        boards: t('common.boardCount', { count: Math.floor(eligible.length / 2) }),
                      })
                    : t('pairings.ready.boardsNote', {
                        boards: t('common.boardCount', { count: eligible.length / 2 }),
                      })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon="users" onClick={() => setAttendanceOpen(true)}>
                  {t('pairings.ready.attendance')}
                </Button>
                <Button
                  icon="sparkles"
                  onClick={handleGenerate}
                  disabled={eligible.length < 2}
                >
                  {t('pairings.ready.generate')}
                </Button>
              </div>
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoNote icon="info">
              <span className="font-bold text-slate-700">{t('pairings.ready.beforeTitle')}</span>{' '}
              {t('pairings.ready.beforeText')}
            </InfoNote>
            <InfoNote tone="amber" icon="alert">
              <span className="font-bold">{t('pairings.ready.noRepeatTitle')}</span>{' '}
              {t('pairings.ready.noRepeatText')}
            </InfoNote>
          </div>
        </>
      ) : !selectedRound ? (
        <Card>
          <EmptyState
            icon="lock"
            title={
              selectedNumber > tournament.totalRounds
                ? t('pairings.allComplete.title')
                : t('pairings.lockFirst.title', { number: selectedNumber - 1 })
            }
            description={
              selectedNumber > tournament.totalRounds
                ? t('pairings.allComplete.description')
                : t('pairings.lockFirst.description')
            }
            action={
              previousRound && previousRound.status !== 'locked' ? (
                <Button
                  icon="arrow-right"
                  onClick={() => setSelectedNumber(previousRound.number)}
                >
                  {t('pairings.lockFirst.openRound', { number: previousRound.number })}
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          {/* Round summary */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill round={selectedRound} t={t} />
                  <Badge tone="slate">
                    {t('pairings.summary.games', {
                      count: selectedRound.pairings.filter((pairing) => !pairing.byePlayerId).length,
                    })}
                  </Badge>
                  {selectedRound.pairings.some((pairing) => pairing.byePlayerId) ? (
                    <Badge tone="amber">{t('pairings.summary.oneBye')}</Badge>
                  ) : null}
                  {stale ? (
                    <Badge tone="amber" dot>
                      {t('pairings.summary.attendanceChanged')}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  {t('pairings.ready.round', { number: selectedRound.number })}
                  <span className="ml-2 text-[13px] font-semibold text-slate-400">
                    {selectedRound.status === 'locked'
                      ? t('pairings.summary.resultsFinal')
                      : progress.complete
                        ? t('pairings.summary.readyToLock')
                        : t('pairings.summary.scoringOpen')}
                  </span>
                </h2>
                <div className="mt-2 flex max-w-md items-center gap-3">
                  <ProgressBar
                    value={progress.reported}
                    max={progress.total}
                    tone={
                      selectedRound.status === 'locked'
                        ? 'emerald'
                        : progress.complete
                          ? 'emerald'
                          : 'amber'
                    }
                    className="w-40 shrink-0"
                  />
                  <p className="tabular text-[12px] font-semibold text-slate-500">
                    {t('pairings.summary.boardsReported', {
                      reported: progress.reported,
                      total: progress.total,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon="printer"
                  onClick={() => onPrint(selectedRound.number)}
                  className="sm:hidden"
                >
                  {t('pairings.print')}
                </Button>
                {canLock ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="users"
                      onClick={() => setAttendanceOpen(true)}
                    >
                      {t('pairings.action.attendance')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="refresh"
                      onClick={() => setRegenerateOpen(true)}
                    >
                      {t('pairings.action.repair')}
                    </Button>
                    <Button
                      size="sm"
                      icon="lock"
                      onClick={handleLock}
                      disabled={!progress.total}
                    >
                      {t('pairings.action.lock')}
                    </Button>
                  </>
                ) : (
                  <>
                    {isLatest ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="unlock"
                        onClick={() => setReopenOpen(true)}
                      >
                        {t('pairings.action.reopen')}
                      </Button>
                    ) : null}
                    {isFinalLocked ? (
                      <Button size="sm" icon="trophy" onClick={() => onPrint(selectedRound.number)}>
                        {t('pairings.action.finalPrint')}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {stale ? (
              <div className="flex flex-col gap-2 border-t border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-amber-900">
                  <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
                  {t('pairings.stale.text')}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="refresh"
                  onClick={() => setRegenerateOpen(true)}
                  className="shrink-0 self-start"
                >
                  {t('pairings.stale.action')}
                </Button>
              </div>
            ) : null}
          </Card>

          {/* Boards */}
          <Card>
            <CardHeader
              title={t('pairings.boards.title')}
              description={
                selectedRound.status === 'locked'
                  ? t('pairings.boards.description.locked')
                  : t('pairings.boards.description.open')
              }
              icon="swords"
              action={
                <div className="hidden items-center gap-4 text-[11px] font-semibold text-slate-400 sm:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-[2px] border border-slate-300 bg-white" />
                    {t('pairings.color.white')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-[2px] border border-slate-900 bg-slate-900" />
                    {t('pairings.color.black')}
                  </span>
                </div>
              }
            />
            <div className="divide-y divide-slate-100">
              {selectedRound.pairings.map((pairing) => (
                <PairingRow
                  key={pairing.id}
                  pairing={pairing}
                  playersById={playersById}
                  standingsById={standingsById}
                  locked={selectedRound.status === 'locked'}
                  t={t}
                  onChangeResult={(pairingId, result) => {
                    const output = updateResult(selectedRound.number, pairingId, result)
                    if (!output.ok) notify(output.error, 'error')
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[11px] text-slate-500">
                {selectedRound.status === 'locked'
                  ? t('pairings.boards.lockedAt', {
                      time: new Date(selectedRound.lockedAt || Date.now()).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }),
                    })
                  : progress.complete
                    ? t('pairings.boards.allReported')
                    : t('pairings.boards.remaining', { count: progress.remaining })}
              </p>
              <div className="flex items-center gap-2">
                {selectedRound.status === 'draft' && selectedRound.number === rounds.length ? (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-600"
                  >
                    {t('pairings.action.deleteRound')}
                  </button>
                ) : null}
                {selectedRound.status === 'locked' && isLatest && !isFinalLocked ? (
                  <Button
                    size="sm"
                    icon="sparkles"
                    onClick={() => {
                      setSelectedNumber(selectedRound.number + 1)
                    }}
                  >
                    {t('pairings.action.pairNext', { number: selectedRound.number + 1 })}
                  </Button>
                ) : null}
                {isFinalLocked ? (
                  <Badge tone="emerald" dot>
                    {t('pairings.complete.badge')}
                  </Badge>
                ) : null}
              </div>
            </div>
          </Card>

          {isFinalLocked ? (
            <Card className="overflow-hidden">
              <div className="flex flex-col items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 to-white p-5 text-center sm:flex-row sm:text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon name="trophy" size={22} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t('pairings.complete.title')}</h3>
                    <p className="text-[12px] text-slate-500">
                      {t('pairings.complete.description')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon="printer" onClick={() => onPrint(selectedRound.number)}>
                    {t('pairings.action.printFinal')}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
        </>
      )}

      {selectedRound?.pairings?.length ? (
        <div className="flex items-center justify-between sm:hidden">
          <Button variant="secondary" size="sm" icon="printer" onClick={() => onPrint(selectedRound.number)}>
            {t('pairings.action.printSheet')}
          </Button>
        </div>
      ) : null}

      <AttendanceModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        roundNumber={selectedNumber}
        canRegenerate={Boolean(selectedRound)}
        onRegenerate={() => {
          setAttendanceOpen(false)
          setRegenerateOpen(true)
        }}
      />

      <ConfirmDialog
        open={regenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        onConfirm={handleRegenerate}
        title={t('pairings.confirm.repair.title', { number: selectedNumber })}
        description={t('pairings.confirm.repair.description')}
        confirmLabel={t('pairings.confirm.repair.confirm')}
        icon="refresh"
        tone="danger"
      />

      <ConfirmDialog
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        onConfirm={forceLock}
        title={t('pairings.confirm.lock.title', { number: selectedNumber })}
        description={t('pairings.confirm.lock.description', { count: progress.remaining })}
        confirmLabel={t('pairings.confirm.lock.confirm')}
        icon="lock"
        tone="danger"
      >
        <InfoNote tone="amber" icon="alert">
          {t('pairings.confirm.lock.tip')}
        </InfoNote>
      </ConfirmDialog>

      <ConfirmDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={handleReopen}
        title={t('pairings.confirm.reopen.title', { number: selectedNumber })}
        description={t('pairings.confirm.reopen.description')}
        confirmLabel={t('pairings.confirm.reopen.confirm')}
        icon="unlock"
        tone="primary"
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('pairings.confirm.delete.title', { number: selectedNumber })}
        description={t('pairings.confirm.delete.description')}
        confirmLabel={t('pairings.confirm.delete.confirm')}
        icon="trash"
      />

      <WarningsModal
        warnings={warnings}
        roundNumber={warningsFor}
        onClose={() => {
          setWarnings([])
          setWarningsFor(null)
          if (warningsFor) notify(t('pairings.toast.ready', { round: warningsFor }))
        }}
      />
    </div>
  )
}
