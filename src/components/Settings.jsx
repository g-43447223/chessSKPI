import { useEffect, useState } from 'react'
import { FORMAT_ROUND_ROBIN, FORMATS } from '../lib/constants'
import { suggestRoundRobinRounds, suggestSwissRounds } from '../lib/stats'
import { cn, formatDate } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  InfoNote,
  Input,
  SectionLabel,
  Toggle,
} from './ui'

const MAX_ROUNDS = 30

function formatKey(format, suffix) {
  return format === FORMAT_ROUND_ROBIN
    ? `format.roundrobin.${suffix}`
    : `format.swiss.${suffix}`
}

function draftFrom(tournament) {
  return {
    name: tournament.name ?? '',
    venue: tournament.venue ?? '',
    date: tournament.date ?? '',
    arbiter: tournament.arbiter ?? '',
    format: tournament.format ?? 'swiss',
    totalRounds: String(tournament.totalRounds ?? 6),
  }
}

function Stepper({ value, min, max, onChange }) {
  const { t } = useLanguage()
  const change = (next) => {
    const clamped = Math.max(min, Math.min(max, next))
    onChange(clamped)
  }
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={t('settings.stepper.fewer')}
        onClick={() => change(value - 1)}
        disabled={value <= min}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
      >
        −
      </button>
      <div className="w-20">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10)
            onChange(Number.isFinite(next) ? next : min)
          }}
          className="text-center text-base font-bold"
          aria-label={t('settings.stepper.totalAria')}
        />
      </div>
      <button
        type="button"
        aria-label={t('settings.stepper.more')}
        onClick={() => change(value + 1)}
        disabled={value >= max}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

export function Settings() {
  const { t, language, setLanguage } = useLanguage()
  const {
    tournament,
    players,
    rounds,
    activePlayers,
    settings,
    updateTournament,
    updateSettings,
    notify,
  } = useTournament()

  const [draft, setDraft] = useState(() => draftFrom(tournament))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(draftFrom(tournament))
    setError('')
  }, [
    tournament.name,
    tournament.venue,
    tournament.date,
    tournament.arbiter,
    tournament.format,
    tournament.totalRounds,
  ])

  const formatLocked = rounds.length > 0
  const minRounds = Math.max(1, rounds.length)
  const maxRounds = Math.min(MAX_ROUNDS, Math.max(minRounds, 30))

  const swissSuggestion = suggestSwissRounds(activePlayers.length)
  const roundRobinSuggestion = suggestRoundRobinRounds(activePlayers.length)
  const suggestion =
    draft.format === FORMAT_ROUND_ROBIN ? roundRobinSuggestion : swissSuggestion
  const suggestedLabel =
    draft.format === FORMAT_ROUND_ROBIN
      ? t('settings.schedule.roundRobinSchedule')
      : t('settings.schedule.swissGuideline')

  const draftedRounds = Math.max(1, Number(draft.totalRounds) || 1)

  const dirty =
    draft.name !== (tournament.name ?? '') ||
    draft.venue !== (tournament.venue ?? '') ||
    draft.date !== (tournament.date ?? '') ||
    draft.arbiter !== (tournament.arbiter ?? '') ||
    draft.format !== tournament.format ||
    draftedRounds !== tournament.totalRounds

  const patch = (value) => {
    setDraft((current) => ({ ...current, ...value }))
    setError('')
  }

  const handleSave = (event) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError(t('settings.error.name'))
      return
    }
    if (draftedRounds < minRounds) {
      setError(t('settings.error.minRounds', { rounds: minRounds }))
      return
    }
    if (draftedRounds > MAX_ROUNDS) {
      setError(t('settings.error.maxRounds', { max: MAX_ROUNDS }))
      return
    }

    const result = updateTournament({
      name: draft.name.trim(),
      venue: draft.venue.trim(),
      date: draft.date,
      arbiter: draft.arbiter.trim(),
      format: draft.format,
      totalRounds: draftedRounds,
    })

    if (!result.ok) {
      setError(result.error)
      notify(result.error, 'error')
      return
    }

    setError('')
    notify(t('settings.toast.saved'))
  }

  const handleDiscard = () => {
    setDraft(draftFrom(tournament))
    setError('')
  }

  const applySuggestion = () => {
    patch({ totalRounds: String(Math.max(minRounds, suggestion)) })
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <Badge tone="amber" dot>
              {t('settings.badge.unsaved')}
            </Badge>
          ) : (
            <Badge tone="emerald" dot>
              {t('settings.badge.saved')}
            </Badge>
          )}
          <span className="text-[12px] text-slate-500">
            {rounds.length
              ? t('settings.summary.paired', {
                  rounds: t('common.roundCount', { count: rounds.length }),
                  players: t('common.activePlayerCount', { count: activePlayers.length }),
                })
              : t('settings.summary.registered', {
                  players: t('common.playerCount', { count: players.length }),
                })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleDiscard} disabled={!dirty}>
            {t('settings.discard')}
          </Button>
          <Button type="submit" icon="check" disabled={!dirty}>
            {t('settings.save')}
          </Button>
        </div>
      </div>

      {error ? (
        <InfoNote tone="rose" icon="alert">
          {error}
        </InfoNote>
      ) : null}

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t('settings.details.title')}
            description={t('settings.details.description')}
            icon="flag"
          />
          <div className="space-y-4 p-5">
            <Field label={t('settings.details.name')} required>
              <Input
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder={t('settings.details.namePlaceholder')}
                maxLength={110}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.details.venue')} hint={t('settings.details.venueHint')}>
                <Input
                  value={draft.venue}
                  onChange={(event) => patch({ venue: event.target.value })}
                  placeholder={t('settings.details.venuePlaceholder')}
                  maxLength={80}
                />
              </Field>
              <Field label={t('settings.details.date')}>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(event) => patch({ date: event.target.value })}
                />
              </Field>
            </div>
            <Field label={t('settings.details.arbiter')} hint={t('settings.details.arbiterHint')}>
              <Input
                value={draft.arbiter}
                onChange={(event) => patch({ arbiter: event.target.value })}
                placeholder={t('settings.details.arbiterPlaceholder')}
                maxLength={80}
              />
            </Field>
            {draft.date ? (
              <p className="text-[11px] text-slate-400">
                {t('settings.details.sheetDate', { date: formatDate(draft.date) })}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader
              title={t('settings.format.title')}
              description={t('settings.format.description')}
              icon="layout"
              action={
                formatLocked ? (
                  <Badge tone="slate">
                    <Icon name="lock" size={11} />
                    {t('settings.format.locked')}
                  </Badge>
                ) : null
              }
            />
            <div className="space-y-3 p-5">
              {FORMATS.map((format) => {
                const selected = draft.format === format.value
                return (
                  <button
                    key={format.value}
                    type="button"
                    disabled={formatLocked}
                    onClick={() => patch({ format: format.value })}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                      selected
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30 ring-inset'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                      formatLocked && 'cursor-not-allowed opacity-70',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        selected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white',
                      )}
                    >
                      {selected ? <Icon name="check" size={12} strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-slate-800">
                          {t(formatKey(format.value, 'label'))}
                        </span>
                        {format.value === FORMAT_ROUND_ROBIN && players.length > 8 ? (
                          <Badge tone="amber">{t('settings.format.bestSmaller')}</Badge>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-slate-500">
                        {t(formatKey(format.value, 'description'))}
                      </span>
                    </span>
                  </button>
                )
              })}
              {formatLocked ? (
                <InfoNote icon="lock">
                  {t('settings.format.lockedNote', {
                    rounds: t(
                      rounds.length === 1
                        ? 'settings.format.lockedRounds.one'
                        : 'settings.format.lockedRounds.other',
                      { count: rounds.length },
                    ),
                  })}
                </InfoNote>
              ) : (
                <InfoNote icon="info">
                  {t('settings.format.info')}
                </InfoNote>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('settings.schedule.title')}
              description={t('settings.schedule.description')}
              icon="calendar"
            />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <SectionLabel>{t('settings.schedule.total')}</SectionLabel>
                  <div className="mt-2">
                    <Stepper
                      value={draftedRounds}
                      min={minRounds}
                      max={maxRounds}
                      onChange={(next) => patch({ totalRounds: String(next) })}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {suggestedLabel}
                  </p>
                  <button
                    type="button"
                    onClick={applySuggestion}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-200 ring-inset hover:bg-emerald-100"
                  >
                    <Icon name="sparkles" size={13} />
                    {t('settings.schedule.use', { count: Math.max(minRounds, suggestion) })}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-200 ring-inset">
                  <p className="tabular text-lg font-black text-slate-900">
                    {activePlayers.length}
                  </p>
                  <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    {t('settings.schedule.active')}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-200 ring-inset">
                  <p className="tabular text-lg font-black text-slate-900">{rounds.length}</p>
                  <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    {t('settings.schedule.paired')}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-2.5 ring-1 ring-slate-200 ring-inset">
                  <p className="tabular text-lg font-black text-slate-900">
                    {Math.max(0, draftedRounds - rounds.length)}
                  </p>
                  <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    {t('settings.schedule.toPlay')}
                  </p>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                {activePlayers.length < 2
                  ? t('settings.schedule.needTwo')
                  : draft.format === FORMAT_ROUND_ROBIN
                    ? t('settings.schedule.roundRobinNote', {
                        players: t('common.playerCount', { count: activePlayers.length }),
                        rounds: roundRobinSuggestion,
                      })
                    : t('settings.schedule.swissNote', {
                        players: t('common.playerCount', { count: activePlayers.length }),
                        rounds: swissSuggestion,
                      })}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={t('settings.print.title')}
          description={t('settings.print.description')}
          icon="printer"
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Toggle
            checked={settings.showRatingsOnPrint ?? true}
            onChange={(value) => updateSettings({ showRatingsOnPrint: value })}
            label={t('settings.print.ratings')}
            description={t('settings.print.ratingsDescription')}
          />
          <Toggle
            checked={settings.includeStandingsOnPrint ?? true}
            onChange={(value) => updateSettings({ includeStandingsOnPrint: value })}
            label={t('settings.print.standings')}
            description={t('settings.print.standingsDescription')}
          />
        </div>
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-[11px] text-slate-400">
            {t('settings.print.hint')}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.language.title')}
          description={t('settings.language.description')}
          icon="globe"
        />
        <div className="p-5">
          <div
            role="group"
            aria-label={t('language.aria')}
            className="grid gap-2 sm:grid-cols-2"
          >
            {LANGUAGES.map((item) => {
              const active = language === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLanguage(item.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30 ring-inset'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <span>
                    <span className="block text-[13px] font-bold text-slate-800">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      {item.short}
                    </span>
                  </span>
                  {active ? (
                    <Icon name="check" size={16} className="text-emerald-600" strokeWidth={3} />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={handleDiscard} disabled={!dirty}>
          {t('settings.discard')}
        </Button>
        <Button type="submit" icon="check" disabled={!dirty}>
          {t('settings.save')}
        </Button>
      </div>
    </form>
  )
}
