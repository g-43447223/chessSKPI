import { useEffect, useState } from 'react'
import { roundProgress } from '../lib/stats'
import { cn, formatDate, formatPoints } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon, KnightMark } from './Icon'

function ProjectorStandings({ rows, t }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-[4rem_1fr_10rem_7rem] gap-4 border-b border-white/15 px-4 pb-3 text-[11px] font-black tracking-[0.16em] text-slate-500 uppercase sm:grid-cols-[5rem_1fr_13rem_9rem]">
        <span className="text-center">{t('projector.standings.rank')}</span>
        <span>{t('projector.standings.player')}</span>
        <span className="hidden sm:block">{t('projector.standings.class')}</span>
        <span className="text-right">{t('projector.standings.points')}</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map((row) => (
          <div
            key={row.id}
            className={cn(
              'grid grid-cols-[4rem_1fr_10rem_7rem] items-center gap-4 px-4 py-3 sm:grid-cols-[5rem_1fr_13rem_9rem] sm:py-4',
              row.rank === 1 && 'bg-amber-400/10',
            )}
          >
            <span
              className={cn(
                'tabular text-center text-2xl font-black sm:text-3xl',
                row.rank === 1
                  ? 'text-amber-300'
                  : row.rank === 2
                    ? 'text-slate-200'
                    : row.rank === 3
                      ? 'text-orange-300'
                      : 'text-slate-500',
              )}
            >
              {row.rank}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg leading-tight font-extrabold text-white sm:text-2xl">
                {row.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:hidden">
                {row.grade || t('common.noClass')} · {row.points} {t('common.pointsShort').toLowerCase()}
              </p>
            </div>
            <span className="hidden truncate text-base font-semibold text-slate-400 sm:block sm:text-lg">
              {row.grade || '—'}
            </span>
            <span className="tabular text-right text-2xl font-black text-emerald-300 sm:text-3xl">
              {formatPoints(row.points)}
            </span>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="py-20 text-center text-lg text-slate-500">{t('projector.standings.empty')}</p>
      ) : null}
    </div>
  )
}

function ProjectorPairings({ round, playersById, t }) {
  if (!round) {
    return (
      <p className="py-20 text-center text-lg text-slate-500">
        {t('projector.pairings.empty')}
      </p>
    )
  }
  const progress = roundProgress(round)
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black tracking-[0.18em] text-emerald-400 uppercase">
            {round.status === 'locked' ? t('projector.finalResults') : t('projector.nowPlaying')}
          </p>
          <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{t('projector.round', { number: round.number })}</h2>
        </div>
        <p className="tabular text-sm font-bold text-slate-400">
          {t('projector.boardsReported', { reported: progress.reported, total: progress.total })}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {round.pairings.map((pairing) => {
          if (pairing.byePlayerId) {
            const player = playersById.get(pairing.byePlayerId)
            return (
              <div
                key={pairing.id}
                className="flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3"
              >
                <span className="text-[10px] font-black tracking-widest text-amber-400">BYE</span>
                <p className="flex-1 truncate text-base font-bold text-white sm:text-lg">
                  {player?.name}
                </p>
                <span className="text-sm font-black text-amber-300">+1</span>
              </div>
            )
          }
          const white = playersById.get(pairing.whiteId)
          const black = playersById.get(pairing.blackId)
          return (
            <div
              key={pairing.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                  {t('projector.board', { board: pairing.board })}
                </span>
                <span className="tabular rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white">
                  {pairing.result === '0.5-0.5'
                    ? '½–½'
                    : pairing.result || 'vs'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-white/60 bg-white" />
                <p className="min-w-0 flex-1 truncate text-base font-bold text-white sm:text-lg">
                  {white?.name}
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-white/30 bg-slate-800" />
                <p className="min-w-0 flex-1 truncate text-base font-bold text-slate-300 sm:text-lg">
                  {black?.name}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ProjectorView({ onClose }) {
  const { t } = useLanguage()
  const { tournament, standings, rounds, players } = useTournament()
  const latestRound = rounds[rounds.length - 1] ?? null
  const [tab, setTab] = useState('standings')
  const [showAll, setShowAll] = useState(false)

  const playersById = new Map(players.map((player) => [player.id, player]))
  const rows = standings.filter((row) => row.status !== 'withdrawn')
  const visible = showAll ? rows.slice(0, 24) : rows.slice(0, 10)

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === '1') setTab('standings')
      if (event.key === '2') setTab('pairings')
    }
    document.addEventListener('keydown', handleKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 chess-pattern opacity-30" aria-hidden="true" />
      <div className="relative flex items-center gap-4 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20 ring-inset">
            <KnightMark className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold sm:text-base">{tournament.name}</p>
            <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              {formatDate(tournament.date)} · {tournament.venue || t('projector.venueDefault')}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-xl bg-white/[0.06] p-1">
            <button
              type="button"
              onClick={() => setTab('standings')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors sm:text-xs',
                tab === 'standings' ? 'bg-white text-ink-950' : 'text-slate-400 hover:text-white',
              )}
            >
              {t('projector.standingsTab')}
            </button>
            <button
              type="button"
              onClick={() => setTab('pairings')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors sm:text-xs',
                tab === 'pairings' ? 'bg-white text-ink-950' : 'text-slate-400 hover:text-white',
              )}
            >
              {t('projector.boardsTab')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/15 px-3 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white sm:text-xs"
          >
            <Icon name="x" size={15} />
            <span className="hidden sm:inline">{t('projector.exit')}</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <p className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase">
              {t('projector.live', {
                format:
                  tournament.format === 'roundrobin'
                    ? t('format.roundrobin.label')
                    : t('format.swiss.label'),
              })}
            </p>
          </div>
          {tab === 'standings' && rows.length > 10 ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="text-[11px] font-bold text-slate-400 hover:text-white"
            >
              {showAll
                ? t('projector.showTop')
                : t('projector.showMore', { count: Math.min(24, rows.length) })}
            </button>
          ) : (
            <p className="text-[11px] text-slate-600">{t('projector.esc')}</p>
          )}
        </div>

        {tab === 'standings' ? (
          <ProjectorStandings rows={visible} t={t} />
        ) : (
          <ProjectorPairings round={latestRound} playersById={playersById} t={t} />
        )}
      </div>

      <div className="relative border-t border-white/10 px-4 py-2.5 text-center text-[10px] font-semibold tracking-wide text-slate-600 uppercase sm:px-6">
        {t('projector.footer', { top: showAll ? '' : t('projector.topPrefix') })}
      </div>
    </div>
  )
}
