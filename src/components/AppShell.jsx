import { useEffect, useState } from 'react'
import { useTournament } from '../state/TournamentProvider'
import { useLanguage } from '../state/LanguageProvider'
import { cn, formatDate } from '../lib/utils'
import { Icon, KnightMark } from './Icon'
import { Badge, Button, IconButton, Input, LanguageSwitch, Modal } from './ui'

const NAV_ITEMS = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: 'grid' },
  { id: 'players', labelKey: 'nav.players', icon: 'users' },
  { id: 'teams', labelKey: 'nav.teams', icon: 'users' },
  { id: 'pairings', labelKey: 'nav.pairings', icon: 'swords' },
  { id: 'standings', labelKey: 'nav.standings', icon: 'trophy' },
  { id: 'data', labelKey: 'nav.data', icon: 'database' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'settings' },
]

const PAGE_META = {
  dashboard: {
    titleKey: 'page.dashboard.title',
    subtitleKey: 'page.dashboard.subtitle',
  },
  players: {
    titleKey: 'page.players.title',
    subtitleKey: 'page.players.subtitle',
  },
  teams: {
    titleKey: 'page.teams.title',
    subtitleKey: 'page.teams.subtitle',
  },
  pairings: {
    titleKey: 'page.pairings.title',
    subtitleKey: 'page.pairings.subtitle',
  },
  standings: {
    titleKey: 'page.standings.title',
    subtitleKey: 'page.standings.subtitle',
  },
  data: {
    titleKey: 'page.data.title',
    subtitleKey: 'page.data.subtitle',
  },
  settings: {
    titleKey: 'page.settings.title',
    subtitleKey: 'page.settings.subtitle',
  },
}

function Brand() {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/25 ring-inset">
        <KnightMark className="h-8 w-8" />
      </span>
      <div>
        <p className="text-[17px] leading-tight font-extrabold tracking-tight text-white">
          {t('app.name')}
        </p>
        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          {t('app.tagline')}
        </p>
      </div>
    </div>
  )
}

function NavList({ page, onNavigate, compact = false }) {
  const { t } = useLanguage()
  return (
    <nav className="flex flex-col gap-1" aria-label={t('nav.main')}>
      {!compact ? (
        <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">
          {t('nav.manage')}
        </p>
      ) : null}
      {NAV_ITEMS.map((item) => {
        const active = page === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
              active
                ? 'bg-white/10 text-white ring-1 ring-white/10 ring-inset'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
            )}
          >
            <Icon
              name={item.icon}
              size={18}
              className={active ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'}
            />
            <span className="flex-1">{t(item.labelKey)}</span>
            {active ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
          </button>
        )
      })}
    </nav>
  )
}

function SidebarFooter() {
  const { t } = useLanguage()
  const { tournament, rounds, players, savedAt, saveError } = useTournament()
  const locked = rounds.filter((round) => round.status === 'locked').length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
          <Icon name="flag" size={13} />
        </span>
        <p className="truncate text-[13px] font-bold text-white">{tournament.name}</p>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        {t('shell.sidebar.playersSummary', {
          players: players.length,
          locked,
          total: tournament.totalRounds,
        })}
      </p>
      <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            saveError ? 'bg-rose-400' : 'bg-emerald-400',
          )}
        />
        <p className="text-[10px] font-medium text-slate-500">
          {saveError
            ? t('shell.save.notSaved')
            : savedAt
              ? t('shell.save.saved')
              : t('shell.save.saving')}
        </p>
      </div>
    </div>
  )
}

export function AppShell({ page, onNavigate, onProjector, children }) {
  const { t, locale } = useLanguage()
  const { rounds, tournament, tournaments, activeId, switchTournament, createTournament, deleteTournament, renameTournament, savedAt, saveError } = useTournament()
  const meta = PAGE_META[page] ?? PAGE_META.dashboard
  const latestRound = rounds[rounds.length - 1] ?? null
  const currentRound = latestRound?.status === 'draft' ? latestRound : rounds.length + 1
  const [mobileOpen, setMobileOpen] = useMobileDrawer()
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [setMobileOpen])

  const navigate = (id) => {
    onNavigate(id)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-ink-950 px-4 py-5 lg:flex">
        <div className="chess-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="px-1">
            <Brand />
          </div>
          <div className="mt-8 flex-1 overflow-y-auto">
            <NavList page={page} onNavigate={navigate} />
          </div>
          <div className="mt-4">
            <SidebarFooter />
          </div>
          <p className="mt-3 px-1 text-[10px] text-slate-600">
            {t('shell.dataLocal')}
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            'relative flex h-full w-[280px] flex-col bg-ink-950 px-4 py-5 shadow-2xl transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="chess-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between">
              <Brand />
              <IconButton
                label={t('shell.menuClose')}
                icon="x"
                variant="outlineWhite"
                onClick={() => setMobileOpen(false)}
              />
            </div>
            <div className="mt-8 flex-1 overflow-y-auto">
              <NavList page={page} onNavigate={navigate} compact />
              <div className="mt-4 space-y-2">
                <select
                  value={activeId}
                  onChange={(event) => switchTournament(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] font-semibold text-white"
                >
                  {tournaments.map((item) => (
                    <option key={item.id} value={item.id} className="text-slate-900">
                      {item.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewName('')
                      setNewOpen(true)
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-white"
                  >
                    {t('shell.tournamentNew')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-rose-300"
                  >
                    {t('shell.tournamentDelete')}
                  </button>
                </div>
              </div>
            </div>
            <SidebarFooter />
          </div>
        </aside>
      </div>

      <div className="min-w-0 lg:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-100/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <IconButton
              label={t('shell.menuOpen')}
              icon="menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[19px] font-extrabold tracking-tight text-slate-900 sm:text-[22px]">
                  {t(meta.titleKey)}
                </h1>
                {tournament.format ? (
                  <Badge tone="slate" className="hidden sm:inline-flex">
                    {tournament.format === 'roundrobin'
                      ? t('format.roundrobin.short')
                      : t('format.swiss.short')}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 hidden truncate text-[12px] text-slate-500 sm:block">
                {t(meta.subtitleKey)}
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 md:flex">
              <Icon name="calendar" size={14} className="text-slate-400" />
              <span className="text-[12px] font-semibold text-slate-600">
                {latestRound?.status === 'locked' && rounds.length === tournament.totalRounds
                  ? t('shell.round.final')
                  : t('shell.round.of', {
                      current: Math.min(currentRound, tournament.totalRounds),
                      total: tournament.totalRounds,
                    })}
              </span>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <select
                value={activeId}
                onChange={(event) => switchTournament(event.target.value)}
                className="h-9 max-w-[180px] rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700"
                aria-label={t('shell.tournamentSelect')}
              >
                {tournaments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <IconButton
                label={t('shell.tournamentNew')}
                icon="plus"
                onClick={() => {
                  const name = window.prompt(t('shell.tournamentNewPrompt'))
                  if (name) createTournament(name)
                }}
              />
              <IconButton
                label={t('shell.tournamentDelete')}
                icon="trash"
                onClick={() => {
                  if (window.confirm(t('shell.tournamentDeleteConfirm'))) deleteTournament(activeId)
                }}
              />
            </div>

            <LanguageSwitch className="scale-90 origin-right sm:scale-100" />

            <button
              type="button"
              onClick={onProjector}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-ink-900 px-3 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-ink-800 sm:h-10 sm:px-3.5"
              title={t('shell.projectorTitle')}
            >
              <Icon name="monitor" size={15} />
              <span className="hidden sm:inline">{t('shell.projector')}</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-5 pb-16 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center">
            <p>
              {t('shell.footer')}
            </p>
            <p className="flex items-center gap-1.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  saveError ? 'bg-rose-500' : 'bg-emerald-500',
                )}
              />
              {saveError
                ? t('shell.save.error')
                : savedAt
                  ? t('shell.save.savedAt', {
                      time: savedAt.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })
                  : t('shell.save.ready')}
              <span className="mx-1 text-slate-300">·</span>
              {formatDate(tournament.date)}
            </p>
          </div>
        </footer>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t('shell.tournamentDelete')}
        icon="trash"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteTournament(activeId)
                setDeleteOpen(false)
              }}
            >
              {t('shell.tournamentDelete')}
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-slate-600">{t('shell.tournamentDeleteConfirm')}</p>
      </Modal>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('shell.tournamentNew')}
        icon="plus"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                const clean = newName.trim()
                if (!clean) return
                createTournament(clean)
                setNewOpen(false)
                setNewName('')
              }}
              disabled={!newName.trim()}
            >
              {t('shell.tournamentNew')}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-[13px] font-semibold text-slate-700">
            {t('shell.tournamentNewPrompt')}
          </label>
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t('shell.tournamentNewPrompt')}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}

/* Tiny local hook to keep the drawer state out of the provider. */
function useMobileDrawer() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])
  return [open, setOpen]
}
