import { useMemo, useState } from 'react'
import { compareStandings, sameRank } from '../lib/stats'
import { exportStandingsCsv } from '../lib/csv'
import { cn, formatPoints } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
} from './ui'

const MEDALS = ['🥇', '🥈', '🥉']

function RankMark({ rank }) {
  if (rank <= 3) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-base">
        {MEDALS[rank - 1]}
      </span>
    )
  }
  return (
    <span className="tabular inline-flex h-8 w-8 items-center justify-center text-[13px] font-bold text-slate-400">
      {rank}
    </span>
  )
}

function FormDots({ wins, draws, losses, t }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
      <span className="text-emerald-600">{wins}{t('standings.form.win')}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">{draws}{t('standings.form.draw')}</span>
      <span className="text-slate-400">·</span>
      <span className="text-rose-500">{losses}{t('standings.form.loss')}</span>
    </span>
  )
}

export function Standings({ onProjector, onPrint }) {
  const { t } = useLanguage()
  const { standings, players, tournament } = useTournament()
  const [grade, setGrade] = useState('all')
  const [search, setSearch] = useState('')
  const [hideWithdrawn, setHideWithdrawn] = useState(false)

  const grades = useMemo(
    () => [...new Set(players.map((player) => player.grade).filter(Boolean))].sort(),
    [players],
  )

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = standings
      .filter((row) => grade === 'all' || row.grade === grade)
      .filter((row) => !hideWithdrawn || row.status !== 'withdrawn')
      .filter(
        (row) =>
          !needle ||
          row.name.toLowerCase().includes(needle) ||
          (row.grade ?? '').toLowerCase().includes(needle),
      )
      .sort(compareStandings)

    let previous = null
    let rank = 0
    return filtered.map((row, index) => {
      if (!previous || !sameRank(previous, row)) rank = index + 1
      previous = row
      return { ...row, displayRank: rank }
    })
  }, [standings, grade, hideWithdrawn, search])

  const anyResults = standings.some((row) => row.games > 0)

  if (!players.length) {
    return (
      <Card>
        <EmptyState
          icon="trophy"
          title={t('standings.empty.noPlayers.title')}
          description={t('standings.empty.noPlayers.description')}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={anyResults ? 'emerald' : 'slate'} dot>
            {anyResults ? t('standings.badge.live') : t('standings.badge.noResults')}
          </Badge>
          <span className="text-[12px] text-slate-500">
            {t('common.playerCount', { count: rows.length })}
            {grade !== 'all' ? t('standings.inClass', { grade }) : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon="printer"
            onClick={() => onPrint?.(null)}
          >
            {t('standings.print')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="download"
            onClick={() => exportStandingsCsv(rows.map((row) => ({ ...row, rank: row.displayRank })), tournament)}
            disabled={!rows.length}
          >
            {t('standings.export')}
          </Button>
          <Button size="sm" variant="dark" icon="monitor" onClick={onProjector}>
            {t('standings.projector')}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative w-full sm:max-w-xs">
              <Icon
                name="search"
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('standings.search.placeholder')}
                className="pl-9"
                aria-label={t('standings.search.aria')}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGrade('all')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                  grade === 'all'
                    ? 'bg-ink-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {t('standings.filter.all')}
              </button>
              {grades.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGrade(item)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                    grade === item
                      ? 'bg-ink-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={hideWithdrawn}
                onChange={(event) => setHideWithdrawn(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {t('standings.hideWithdrawn')}
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="search"
            title={t('standings.empty.title')}
            description={t('standings.empty.description')}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGrade('all')
                  setSearch('')
                  setHideWithdrawn(false)
                }}
              >
                {t('standings.empty.reset')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] font-bold tracking-[0.06em] text-slate-400 uppercase">
                    <th className="w-16 px-4 py-3 text-center">{t('standings.table.rank')}</th>
                    <th className="px-3 py-3">{t('standings.table.player')}</th>
                    <th className="px-3 py-3">{t('standings.table.class')}</th>
                    <th className="px-3 py-3 text-right">{t('standings.table.rating')}</th>
                    <th className="bg-emerald-50/40 px-3 py-3 text-right text-emerald-700">{t('standings.table.points')}</th>
                    <th className="px-3 py-3 text-right" title={t('print.tiebreak.buchholz')}>
                      {t('standings.table.bhc1')}
                    </th>
                    <th className="px-3 py-3 text-right" title={t('print.tiebreak.direct')}>
                      {t('standings.table.direct')}
                    </th>
                    <th className="px-3 py-3 text-right" title={t('print.tiebreak.sb')}>
                      {t('standings.table.sb')}
                    </th>
                    <th className="px-4 py-3 text-center">{t('standings.table.wdl')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'group transition-colors hover:bg-slate-50/80',
                        row.displayRank === 1 && 'bg-amber-50/30',
                        row.status === 'withdrawn' && 'opacity-65',
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        <RankMark rank={row.displayRank} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={row.name}
                            tone={
                              row.displayRank === 1
                                ? 'amber'
                                : row.status === 'withdrawn'
                                  ? 'slate'
                                  : 'emerald'
                            }
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[13px] font-bold text-slate-800">
                                {row.name}
                              </p>
                              {row.status === 'withdrawn' ? (
                                <Badge tone="rose">{t('standings.badge.withdrawn')}</Badge>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {row.byes ? t('standings.row.byes', { count: row.byes }) : ''}
                              {t('standings.row.games', { count: row.games })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-slate-600">{row.grade || '—'}</td>
                      <td className="tabular px-3 py-3 text-right text-[12px] text-slate-500">
                        {row.rating || '—'}
                      </td>
                      <td className="tabular bg-emerald-50/30 px-3 py-3 text-right text-[15px] font-black text-slate-900">
                        {formatPoints(row.points)}
                      </td>
                      <td className="tabular px-3 py-3 text-right text-[12px] font-semibold text-slate-500">
                        {formatPoints(row.buchholzCut1)}
                      </td>
                      <td className="tabular px-3 py-3 text-right text-[12px] font-semibold text-slate-500">
                        {formatPoints(row.directEncounter)}
                      </td>
                      <td className="tabular px-3 py-3 text-right text-[12px] font-semibold text-slate-500">
                        {formatPoints(row.sonnebornBerger)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <FormDots wins={row.wins} draws={row.draws} losses={row.losses} t={t} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    'p-4',
                    row.displayRank === 1 && 'bg-amber-50/40',
                    row.status === 'withdrawn' && 'opacity-70',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RankMark rank={row.displayRank} />
                    <Avatar
                      name={row.name}
                      tone={row.displayRank === 1 ? 'amber' : 'emerald'}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-bold text-slate-800">{row.name}</p>
                        {row.status === 'withdrawn' ? <Badge tone="rose">{t('standings.badge.withdrawn')}</Badge> : null}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {row.grade || t('common.noClass')} · {t('standings.mobile.rating', { rating: row.rating || '—' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-xl leading-none font-black text-slate-900">
                        {formatPoints(row.points)}
                      </p>
                      <p className="mt-1 text-[9px] font-bold tracking-wide text-slate-400">{t('common.pointsShort')}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="tabular text-[12px] font-bold text-slate-700">
                        {formatPoints(row.buchholzCut1)}
                      </p>
                      <p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                        {t('standings.table.bhc1')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="tabular text-[12px] font-bold text-slate-700">
                        {formatPoints(row.directEncounter)}
                      </p>
                      <p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                        {t('standings.table.direct')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-1.5">
                      <p className="tabular text-[12px] font-bold text-slate-700">
                        {formatPoints(row.sonnebornBerger)}
                      </p>
                      <p className="text-[9px] font-bold tracking-wide text-slate-400 uppercase">
                        {t('standings.table.sb')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <FormDots wins={row.wins} draws={row.draws} losses={row.losses} t={t} />
                    <p className="text-[10px] text-slate-400">
                      {t('standings.row.games', { count: row.games })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-400">
            {grade === 'all'
              ? t('standings.footer.overall')
              : t('standings.footer.category', { grade })}
          </p>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            {t('standings.footer.live')}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
            <Icon name="info" size={16} className="text-slate-400" />
            {t('standings.tiebreak.title')}
          </h3>
          <dl className="mt-3 space-y-3 text-[12px] leading-relaxed">
            <div>
              <dt className="font-bold text-slate-700">{t('standings.tiebreak.buchholz.title')}</dt>
              <dd className="text-slate-500">
                {t('standings.tiebreak.buchholz.text')}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-700">{t('standings.tiebreak.direct.title')}</dt>
              <dd className="text-slate-500">
                {t('standings.tiebreak.direct.text')}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-slate-700">{t('standings.tiebreak.sb.title')}</dt>
              <dd className="text-slate-500">
                {t('standings.tiebreak.sb.text')}
              </dd>
            </div>
          </dl>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            {t('standings.tiebreak.note')}
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
            <Icon name="monitor" size={16} className="text-slate-400" />
            {t('standings.projector.title')}
          </h3>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
            {t('standings.projector.text')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="dark" icon="monitor" onClick={onProjector}>
              {t('standings.projector.open')}
            </Button>
            <Button size="sm" variant="secondary" icon="printer" onClick={() => onPrint?.(null)}>
              {t('standings.projector.print')}
            </Button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] leading-relaxed text-slate-500">
              <span className="font-bold text-slate-700">{t('standings.prizes.title')}</span>{' '}
              {t('standings.prizes.text')}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
