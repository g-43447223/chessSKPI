import { useRef, useState } from 'react'
import {
  downloadPlayerTemplate,
  exportPairingsCsv,
  exportPlayersCsv,
  exportStandingsCsv,
} from '../lib/csv'
import { normalizeState } from '../lib/storage'
import {
  downloadText,
  formatDate,
  readFileAsText,
  slugify,
  todayISO,
} from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  InfoNote,
  SectionLabel,
  StatCard,
} from './ui'

function ReportRow({ icon, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon name={icon} size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-800">{title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="shrink-0 pl-12 sm:pl-0">{action}</div>
    </div>
  )
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200 ring-inset">
      <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-slate-800">{value}</p>
    </div>
  )
}

export function DataBackup() {
  const { t, locale } = useLanguage()
  const {
    state,
    tournament,
    players,
    rounds,
    standings,
    savedAt,
    saveError,
    getStorageSize,
    importState,
    loadDemo,
    resetAll,
    notify,
  } = useTournament()

  const fileRef = useRef(null)
  const [pending, setPending] = useState(null)
  const [importError, setImportError] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const storageBytes = getStorageSize()
  const storageLabel =
    storageBytes >= 1024 * 1024
      ? `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(storageBytes / 1024))} KB`

  const lockedRounds = rounds.filter((round) => round.status === 'locked').length
  const reportedGames = rounds.reduce(
    (total, round) =>
      total +
      (round.pairings ?? []).filter(
        (pairing) => !pairing.byePlayerId && pairing.result,
      ).length,
    0,
  )

  const exportBackup = () => {
    downloadText(
      `${slugify(tournament.name)}-${todayISO()}-chessdesk.json`,
      JSON.stringify(state, null, 2),
      'application/json;charset=utf-8',
    )
    notify(t('data.toast.backupDownloaded'))
  }

  const handleImportFile = async (file) => {
    if (!file) return
    setImportError('')
    try {
      const content = await readFileAsText(file)
      const raw = JSON.parse(content)
      const normalized = normalizeState(raw)
      setPending({ raw, normalized, fileName: file.name })
    } catch (error) {
      setPending(null)
      setImportError(
        error?.message
          ? t('data.error.importRead', { error: error.message })
          : t('data.error.importReadGeneric'),
      )
      notify(t('data.toast.importReadError'), 'error')
    }
  }

  const confirmImport = () => {
    if (!pending) return
    const result = importState(pending.raw)
    if (!result.ok) {
      notify(result.error, 'error')
      return
    }
    notify(
      t('data.toast.imported', {
        players: t('common.playerCount', { count: pending.normalized.players.length }),
        rounds: t('common.roundCount', { count: pending.normalized.rounds.length }),
      }),
    )
    setPending(null)
    setImportError('')
  }

  const handleReset = () => {
    resetAll()
    setResetOpen(false)
    setImportError('')
    notify(t('data.toast.reset'), 'info')
  }

  const handleDemo = () => {
    loadDemo()
    setDemoOpen(false)
    notify(t('data.toast.demo'), 'info')
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('data.stats.players')}
          value={players.length}
          hint={t('data.stats.playersHint', {
            count: players.filter((player) => player.status !== 'withdrawn').length,
          })}
          icon="users"
          tone="emerald"
        />
        <StatCard
          label={t('data.stats.rounds')}
          value={rounds.length}
          hint={t('data.stats.roundsHint', { locked: lockedRounds, games: reportedGames })}
          icon="swords"
          tone="indigo"
        />
        <StatCard
          label={t('data.stats.storage')}
          value={storageLabel}
          hint={t('data.stats.storageHint')}
          icon="database"
          tone="amber"
        />
        <StatCard
          label={t('data.stats.lastSaved')}
          value={
            savedAt
              ? savedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
              : '—'
          }
          hint={saveError ? t('data.stats.saveError') : t('data.stats.autosave')}
          icon="clock"
          tone={saveError ? 'rose' : 'emerald'}
        />
      </div>

      {saveError ? (
        <InfoNote tone="rose" icon="alert">
          <span className="font-bold">{t('data.saveError.title')}</span>{' '}
          {t('data.saveError.text', { error: saveError })}
        </InfoNote>
      ) : null}

      <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t('data.backup.title')}
            description={t('data.backup.description')}
            icon="database"
            action={
              <Badge tone="emerald" dot>
                {t('data.backup.portable')}
              </Badge>
            }
          />
          <div className="space-y-4 p-5">
            <InfoNote icon="info">
              {t('data.backup.info')}
            </InfoNote>

            <div className="flex flex-wrap gap-2">
              <Button icon="download" onClick={exportBackup}>
                {t('data.backup.download')}
              </Button>
              <Button
                variant="secondary"
                icon="upload"
                onClick={() => fileRef.current?.click()}
              >
                {t('data.backup.import')}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(event) => {
                  handleImportFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>

            {importError ? (
              <InfoNote tone="rose" icon="alert">
                {importError}
              </InfoNote>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <SectionLabel>{t('data.backup.included')}</SectionLabel>
              <ul className="mt-2 grid gap-1.5 text-[12px] text-slate-600 sm:grid-cols-2">
                {[
                  t('data.backup.included.1'),
                  t('data.backup.included.2', {
                    players: t('common.playerCount', { count: players.length }),
                  }),
                  t('data.backup.included.3'),
                  t('data.backup.included.4', {
                    rounds: t('common.roundCount', { count: rounds.length }),
                  }),
                  t('data.backup.included.5'),
                  t('data.backup.included.6'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <Icon name="check" size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              {t('data.backup.replaceNote')}
            </p>
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader
              title={t('data.reports.title')}
              description={t('data.reports.description')}
              icon="file"
            />
            <div className="divide-y divide-slate-100">
              <ReportRow
                icon="trophy"
                title={t('data.reports.standings')}
                description={t('data.reports.standingsDescription')}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    disabled={!players.length}
                    onClick={() => {
                      exportStandingsCsv(standings, tournament)
                      notify(t('data.toast.standingsCsv'))
                    }}
                  >
                    {t('data.reports.csv')}
                  </Button>
                }
              />
              <ReportRow
                icon="swords"
                title={t('data.reports.pairings')}
                description={t('data.reports.pairingsDescription')}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    disabled={!rounds.length}
                    onClick={() => {
                      exportPairingsCsv(state)
                      notify(t('data.toast.pairingsCsv'))
                    }}
                  >
                    {t('data.reports.csv')}
                  </Button>
                }
              />
              <ReportRow
                icon="users"
                title={t('data.reports.players')}
                description={t('data.reports.playersDescription')}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="download"
                    disabled={!players.length}
                    onClick={() => {
                      exportPlayersCsv(state)
                      notify(t('data.toast.playersCsv'))
                    }}
                  >
                    {t('data.reports.csv')}
                  </Button>
                }
              />
              <ReportRow
                icon="clipboard"
                title={t('data.reports.template')}
                description={t('data.reports.templateDescription')}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="download"
                    onClick={() => {
                      downloadPlayerTemplate()
                      notify(t('data.toast.template'))
                    }}
                  >
                    {t('data.reports.templateButton')}
                  </Button>
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('data.demo.title')}
              description={t('data.demo.description')}
              icon="sparkles"
            />
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] leading-relaxed text-slate-500">
                {t('data.demo.text')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon="sparkles"
                className="shrink-0"
                onClick={() => setDemoOpen(true)}
              >
                {t('data.demo.load')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={t('data.storage.title')}
          description={t('data.storage.description')}
          icon="database"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-center gap-2">
              <span
                className={
                  saveError
                    ? 'h-2 w-2 rounded-full bg-rose-500'
                    : 'h-2 w-2 rounded-full bg-emerald-500'
                }
              />
              <p className="text-[12px] font-bold text-slate-700">
                {saveError ? t('data.storage.problem') : t('data.storage.saving')}
              </p>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {saveError
                ? saveError
                : savedAt
                  ? t('data.storage.savedAt', {
                      time: savedAt.toLocaleTimeString(locale),
                    })
                  : t('data.storage.firstSave')}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[12px] font-bold text-slate-700">{t('data.storage.used')}</p>
            <p className="tabular mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {t('data.storage.usedText', {
                size: storageLabel,
                players: t('common.playerCount', { count: players.length }),
                rounds: t('common.roundCount', { count: rounds.length }),
              })}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[12px] font-bold text-slate-700">{t('data.storage.local')}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              {t('data.storage.localText')}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-rose-200">
        <CardHeader
          title={t('data.danger.title')}
          description={t('data.danger.description')}
          icon="alert"
          className="border-rose-100"
        />
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-700">
              {players.length
                ? t('data.danger.warning', {
                    players: t('common.playerCount', { count: players.length }),
                    rounds: t('common.roundCount', { count: rounds.length }),
                  })
                : t('data.danger.empty')}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {t('data.danger.meta', {
                date: formatDate(tournament.date) || t('common.notSet'),
                format:
                  tournament.format === 'roundrobin'
                    ? t('format.roundrobin.label')
                    : t('format.swiss.label'),
              })}
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            className="shrink-0"
            disabled={!players.length && !rounds.length}
            onClick={() => setResetOpen(true)}
          >
            {t('data.danger.clear')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={confirmImport}
        title={t('data.import.title')}
        description={t('data.import.description')}
        confirmLabel={t('data.import.confirm')}
        cancelLabel={t('data.import.keep')}
        icon="upload"
        tone="primary"
      >
        {pending ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[13px] font-bold text-slate-800">
                  {pending.normalized.tournament.name}
                </p>
                <Badge tone="emerald" dot>
                  {t('data.import.valid')}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {t('data.import.fileMeta', {
                  file: pending.fileName,
                  date: formatDate(pending.normalized.tournament.date) || t('common.notSet'),
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <PreviewStat
                  label={t('data.import.players')}
                  value={pending.normalized.players.length}
                />
                <PreviewStat
                  label={t('data.import.rounds')}
                  value={pending.normalized.rounds.length}
                />
                <PreviewStat
                  label={t('data.import.locked')}
                  value={
                    pending.normalized.rounds.filter((round) => round.status === 'locked')
                      .length
                  }
                />
                <PreviewStat
                  label={t('data.import.format')}
                  value={
                    pending.normalized.tournament.format === 'roundrobin'
                      ? t('format.roundrobin.short')
                      : t('format.swiss.short')
                  }
                />
              </div>
            </div>
            <InfoNote tone="amber" icon="alert">
              {t('data.import.replaceNote', {
                players: t('common.playerCount', { count: players.length }),
                rounds: t('common.roundCount', { count: rounds.length }),
              })}
            </InfoNote>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onConfirm={handleDemo}
        title={t('data.demoConfirm.title')}
        description={t('data.demoConfirm.description')}
        confirmLabel={t('data.demo.load')}
        icon="sparkles"
        tone="primary"
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleReset}
        title={t('data.reset.title')}
        description={t('data.reset.description')}
        confirmLabel={t('data.reset.confirm')}
        icon="trash"
      >
        <InfoNote tone="rose" icon="alert">
          {t('data.reset.note')}
        </InfoNote>
      </ConfirmDialog>
    </div>
  )
}
