import { useMemo } from 'react'
import { roundProgress } from '../lib/stats'
import { formatDate, formatPoints } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  SectionLabel,
  StatCard,
} from './ui'

const MEDALS = ['🥇', '🥈', '🥉']

const ROUND_STATUS_KEYS = {
  locked: 'dashboard.roundStatus.locked',
  draft: 'dashboard.roundStatus.draft',
  next: 'dashboard.roundStatus.next',
  upcoming: 'dashboard.roundStatus.upcoming',
}

function RoundPip({ number, round, isNext, onClick }) {
  const { t } = useLanguage()
  const status = round?.status ?? (isNext ? 'next' : 'upcoming')
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5"
      title={
        round
          ? t('dashboard.roundPip.title', {
              number,
              status: t(ROUND_STATUS_KEYS[status] ?? 'dashboard.roundStatus.upcoming'),
            })
          : t('dashboard.roundPip.notPaired', { number })
      }
    >
      <span
        className={
          status === 'locked'
            ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-[13px] font-extrabold text-white shadow-sm'
            : status === 'draft'
              ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-[13px] font-extrabold text-amber-950 ring-4 ring-amber-100'
              : isNext
                ? 'flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-emerald-400 bg-white text-[13px] font-extrabold text-emerald-700'
                : 'flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-[13px] font-extrabold text-slate-400'
        }
      >
        {status === 'locked' ? <Icon name="check" size={15} /> : number}
      </span>
      <span className="text-[10px] font-bold tracking-wide text-slate-400">R{number}</span>
    </button>
  )
}

export function Dashboard({ onNavigate }) {
  const { t } = useLanguage()
  const { tournament, players, rounds, standings, activePlayers } = useTournament()
  const formatLabel =
    tournament.format === 'roundrobin' ? t('format.roundrobin.label') : t('format.swiss.label')

  const lastRound = rounds[rounds.length - 1] ?? null
  const draftRound = lastRound?.status === 'draft' ? lastRound : null
  const lockedCount = rounds.filter((round) => round.status === 'locked').length
  const nextRoundNumber = rounds.length + 1
  const allDone =
    rounds.length >= tournament.totalRounds &&
    rounds.every((round) => round.status === 'locked')
  const progress = roundProgress(draftRound)
  const playerMap = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])

  const gamesPlayed = useMemo(
    () =>
      rounds.reduce(
        (total, round) =>
          total +
          round.pairings.filter((pairing) => !pairing.byePlayerId && pairing.result).length,
        0,
      ),
    [rounds],
  )

  const leader = standings[0] ?? null
  const withdrawn = players.length - activePlayers.length
  const grades = new Set(players.map((player) => player.grade).filter(Boolean))

  const heroAction = (() => {
    if (!players.length) {
      return { label: t('dashboard.hero.register'), icon: 'user-plus', page: 'players' }
    }
    if (!rounds.length) {
      return { label: t('dashboard.hero.pairFirst'), icon: 'swords', page: 'pairings' }
    }
    if (draftRound) {
      return { label: t('dashboard.hero.continueScoring'), icon: 'pencil', page: 'pairings' }
    }
    if (allDone) {
      return { label: t('dashboard.hero.finalStandings'), icon: 'trophy', page: 'standings' }
    }
    return {
      label: t('dashboard.hero.pairRound', {
        number: Math.min(nextRoundNumber, tournament.totalRounds),
      }),
      icon: 'swords',
      page: 'pairings',
    }
  })()

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 text-white shadow-xl shadow-ink-950/20">
        <div className="chess-pattern absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="emerald" dot className="bg-emerald-400/10 text-emerald-300 ring-emerald-400/25">
                {allDone
                  ? t('dashboard.hero.done')
                  : rounds.length
                    ? t('dashboard.hero.running')
                    : t('dashboard.hero.ready')}
              </Badge>
              <span className="text-[11px] font-semibold tracking-wide text-slate-400">
                {formatLabel}
              </span>
            </div>
            <h2 className="mt-3 max-w-2xl text-[26px] leading-[1.12] font-black tracking-tight sm:text-[34px]">
              {tournament.name}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={14} />
                {formatDate(tournament.date) || t('dashboard.hero.dateNotSet')}
              </span>
              {tournament.venue ? (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="pin" size={14} />
                  {tournament.venue}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" size={14} />
                {t('common.activePlayerCount', { count: activePlayers.length })}
              </span>
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Button
                size="lg"
                variant="white"
                icon={heroAction.icon}
                onClick={() => onNavigate(heroAction.page)}
              >
                {heroAction.label}
              </Button>
              <Button
                size="lg"
                variant="outlineWhite"
                icon="trophy"
                onClick={() => onNavigate('standings')}
              >
                {t('dashboard.hero.standings')}
              </Button>
              <Button
                size="lg"
                variant="outlineWhite"
                icon="printer"
                onClick={() => onNavigate('pairings')}
                className="sm:hidden"
              >
                {t('dashboard.hero.printSheets')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm lg:min-w-[260px]">
            <div
              className="relative flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#34d399 ${
                  tournament.totalRounds
                    ? Math.round((lockedCount / tournament.totalRounds) * 100)
                    : 0
                }%, rgba(255,255,255,0.12) 0)`,
              }}
            >
              <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-ink-900">
                <span className="tabular text-xl font-black">{lockedCount}</span>
                <span className="text-[9px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                  {t('dashboard.hero.ofTotal', { total: tournament.totalRounds })}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                {t('dashboard.hero.roundsLocked')}
              </p>
              <p className="mt-1 text-sm font-bold">
                {draftRound
                  ? t('dashboard.hero.roundRunning', { number: draftRound.number })
                  : allDone
                    ? t('dashboard.hero.resultsReady')
                    : t('dashboard.hero.nextRound', {
                        number: Math.min(nextRoundNumber, tournament.totalRounds),
                      })}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {draftRound
                  ? t('dashboard.hero.reportedBoards', {
                      reported: progress.reported,
                      total: progress.total,
                    })
                  : t('dashboard.hero.roundsRemaining', {
                      count: tournament.totalRounds - lockedCount,
                    })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {players.length === 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title={t('dashboard.empty.title')}
            description={t('dashboard.empty.description')}
            icon="sparkles"
          />
          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            {[
              {
                step: '01',
                title: t('dashboard.step.register.title'),
                text: t('dashboard.step.register.text'),
                action: t('dashboard.step.register.action'),
                page: 'players',
                icon: 'users',
              },
              {
                step: '02',
                title: t('dashboard.step.pair.title'),
                text: t('dashboard.step.pair.text'),
                action: t('dashboard.step.pair.action'),
                page: 'pairings',
                icon: 'swords',
              },
              {
                step: '03',
                title: t('dashboard.step.report.title'),
                text: t('dashboard.step.report.text'),
                action: t('dashboard.step.report.action'),
                page: 'standings',
                icon: 'trophy',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="text-[11px] font-black tracking-widest text-slate-300">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 flex-1 text-[12px] leading-relaxed text-slate-500">{item.text}</p>
                <button
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className="mt-3 inline-flex items-center gap-1 self-start text-[12px] font-bold text-emerald-700 hover:text-emerald-800"
                >
                  {item.action}
                  <Icon name="arrow-right" size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label={t('dashboard.stats.activePlayers')}
              value={activePlayers.length}
              hint={t('dashboard.stats.registeredHint', {
                count: players.length,
                withdrawn: withdrawn
                  ? t('dashboard.stats.withdrawnHint', { count: withdrawn })
                  : '',
              })}
              icon="users"
              tone="emerald"
            />
            <StatCard
              label={t('dashboard.stats.lockedRounds')}
              value={`${lockedCount}/${tournament.totalRounds}`}
              hint={
                draftRound
                  ? t('dashboard.stats.scoringHint', { number: draftRound.number })
                  : t('dashboard.stats.finalizedHint')
              }
              icon="lock"
              tone="indigo"
            />
            <StatCard
              label={t('dashboard.stats.gamesReported')}
              value={gamesPlayed}
              hint={t('dashboard.stats.boardsScheduled', {
                count: rounds.reduce((total, round) => total + (round.pairings?.length ?? 0), 0),
              })}
              icon="swords"
              tone="amber"
            />
            <StatCard
              label={t('dashboard.stats.leader')}
              value={leader ? formatPoints(leader.points) : '—'}
              hint={
                leader
                  ? `${leader.name}${leader.grade ? ` · ${leader.grade}` : ''}`
                  : t('dashboard.stats.noResults')
              }
              icon="crown"
              tone="emerald"
            />
          </div>

          <div className="grid gap-4 sm:gap-5 xl:grid-cols-[1.45fr_1fr]">
            {/* Current round */}
            <Card>
              <CardHeader
                title={
                  draftRound
                    ? t('dashboard.current.title.draft', { number: draftRound.number })
                    : allDone
                      ? t('dashboard.current.title.done')
                      : rounds.length
                        ? t('dashboard.current.title.ready', { number: nextRoundNumber })
                        : t('dashboard.current.title.first')
                }
                description={
                  draftRound
                    ? t('dashboard.current.description.draft')
                    : allDone
                      ? t('dashboard.current.description.done')
                      : t('dashboard.current.description.next')
                }
                icon={draftRound ? 'pencil' : 'swords'}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="arrow-right"
                    onClick={() => onNavigate('pairings')}
                  >
                    {t('dashboard.current.open')}
                  </Button>
                }
              />
              <div className="p-5 sm:p-6">
                {draftRound ? (
                  <>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <SectionLabel>{t('dashboard.current.reportLabel')}</SectionLabel>
                        <p className="tabular mt-1 text-2xl font-black text-slate-900">
                          {progress.reported}
                          <span className="text-base font-bold text-slate-400">
                            {' '}
                            / {progress.total}
                          </span>
                        </p>
                      </div>
                      <Badge tone={progress.complete ? 'emerald' : 'amber'} dot>
                        {progress.complete
                          ? t('dashboard.current.readyToLock')
                          : t('dashboard.current.remaining', { count: progress.remaining })}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={progress.reported}
                      max={progress.total}
                      tone={progress.complete ? 'emerald' : 'amber'}
                      className="mt-3"
                    />
                    <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {draftRound.pairings.slice(0, 5).map((pairing) => {
                        if (pairing.byePlayerId) {
                          const player = playerMap.get(pairing.byePlayerId)
                          return (
                            <div key={pairing.id} className="flex items-center gap-3 px-3.5 py-2.5">
                              <span className="flex h-6 w-8 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">
                                BYE
                              </span>
                              <p className="flex-1 truncate text-[13px] font-semibold text-slate-700">
                                {player?.name ?? t('common.unknownPlayer')}
                              </p>
                              <Badge tone="emerald">{t('pairings.bye.points')}</Badge>
                            </div>
                          )
                        }
                        const white = playerMap.get(pairing.whiteId)
                        const black = playerMap.get(pairing.blackId)
                        return (
                          <div key={pairing.id} className="flex items-center gap-3 px-3.5 py-2.5">
                            <span className="tabular flex h-6 w-8 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">
                              B{pairing.board}
                            </span>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-slate-300 bg-white" />
                              <p className="min-w-0 truncate text-[13px] font-semibold text-slate-700">
                                {white?.name ?? '—'}
                              </p>
                              <span className="text-[10px] font-bold text-slate-400">vs</span>
                              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] border border-slate-900 bg-slate-900" />
                              <p className="min-w-0 truncate text-[13px] font-semibold text-slate-700">
                                {black?.name ?? '—'}
                              </p>
                            </div>
                            <span className="tabular w-14 text-right text-[12px] font-bold text-slate-500">
                              {pairing.result || '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {draftRound.pairings.length > 5 ? (
                      <button
                        type="button"
                        onClick={() => onNavigate('pairings')}
                        className="mt-3 text-[12px] font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        {t('dashboard.current.moreBoards', { count: draftRound.pairings.length - 5 })}
                      </button>
                    ) : null}
                  </>
                ) : allDone ? (
                  <EmptyState
                    icon="trophy"
                    title={t('dashboard.current.allLocked.title')}
                    description={t('dashboard.current.allLocked.description')}
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button size="sm" icon="trophy" onClick={() => onNavigate('standings')}>
                          {t('dashboard.current.finalStandings')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="printer"
                          onClick={() => onNavigate('pairings')}
                        >
                          {t('dashboard.current.printSheets')}
                        </Button>
                      </div>
                    }
                    className="py-4"
                  />
                ) : (
                  <div className="flex flex-col items-center py-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <Icon name="swords" size={25} />
                    </div>
                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {rounds.length
                        ? t('dashboard.current.pairRound', { number: nextRoundNumber })
                        : t('dashboard.current.generateFirst')}
                    </h3>
                    <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">
                      {activePlayers.length < 2
                        ? t('dashboard.current.needTwo')
                        : t('dashboard.current.playersWillPair', {
                            count: activePlayers.length,
                            bye:
                              activePlayers.length % 2 ? t('dashboard.current.withBye') : '',
                          })}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        icon="swords"
                        onClick={() => onNavigate('pairings')}
                        disabled={activePlayers.length < 2}
                      >
                        {t('dashboard.current.openPairingDesk')}
                      </Button>
                      <Button
                        variant="secondary"
                        icon="users"
                        onClick={() => onNavigate('players')}
                      >
                        {t('dashboard.current.checkAttendance')}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <SectionLabel>{t('dashboard.current.timeline')}</SectionLabel>
                    <span className="text-[11px] font-medium text-slate-400">
                      {t('dashboard.current.classes', { count: grades.size })}
                    </span>
                  </div>
                  <div className="scroll-thin mt-3 flex gap-3 overflow-x-auto pb-1">
                    {Array.from({ length: tournament.totalRounds }, (_, index) => {
                      const number = index + 1
                      const round = rounds.find((item) => item.number === number)
                      return (
                        <RoundPip
                          key={number}
                          number={number}
                          round={round}
                          isNext={!round && number === nextRoundNumber}
                          onClick={() => onNavigate('pairings')}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader
                title={t('dashboard.leaderboard.title')}
                description={t('dashboard.leaderboard.description')}
                icon="trophy"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    iconRight="chevron-right"
                    onClick={() => onNavigate('standings')}
                  >
                    {t('dashboard.leaderboard.all')}
                  </Button>
                }
              />
              <div className="p-2 sm:p-3">
                {standings.length === 0 ? (
                  <EmptyState
                    icon="users"
                    title={t('dashboard.leaderboard.empty.title')}
                    description={t('dashboard.leaderboard.empty.description')}
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-1">
                    {standings.slice(0, 5).map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-slate-50"
                      >
                        <span className="w-6 text-center text-base font-black text-slate-400">
                          {row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
                        </span>
                        <Avatar name={row.name} tone={row.rank === 1 ? 'emerald' : 'slate'} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-slate-800">
                            {row.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {row.grade || t('common.noClass')} · BH-C1 {formatPoints(row.buchholzCut1)}
                          </p>
                        </div>
                        <span className="tabular text-[17px] font-black text-slate-900">
                          {formatPoints(row.points)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    <span className="font-bold text-slate-700">{t('dashboard.leaderboard.tiebreakLabel')}</span>{' '}
                    {t('dashboard.leaderboard.tiebreak')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
