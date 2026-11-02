import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_RATING } from '../lib/constants'
import { exportPlayersCsv, parsePlayerImport, downloadPlayerTemplate } from '../lib/csv'
import { cn, formatPoints, readFileAsText } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon } from './Icon'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  InfoNote,
  Input,
  Modal,
  Select,
  Textarea,
} from './ui'

const EMPTY_FORM = { name: '', grade: '', rating: String(DEFAULT_RATING) }

function PlayerModal({ open, onClose, player, onSave, existingNames }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const editing = Boolean(player)

  useEffect(() => {
    if (!open) return
    setForm(
      player
        ? {
            name: player.name,
            grade: player.grade ?? '',
            rating: String(player.rating ?? DEFAULT_RATING),
          }
        : EMPTY_FORM,
    )
    setError('')
  }, [open, player?.id])

  const duplicate =
    form.name.trim() &&
    existingNames.some(
      (name) => name.toLowerCase() === form.name.trim().toLowerCase() && name !== player?.name,
    )

  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError(t('players.error.name'))
      return
    }
    const rating = Number(form.rating)
    if (!Number.isFinite(rating) || rating < 0 || rating > 3000) {
      setError(t('players.error.rating'))
      return
    }
    const result = onSave({
      name: form.name.trim(),
      grade: form.grade.trim(),
      rating,
    })
    if (!result?.ok) {
      setError(result?.error ?? t('players.error.save'))
      return
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('players.modal.edit.title') : t('players.modal.add.title')}
      description={
        editing
          ? t('players.modal.edit.description')
          : t('players.modal.add.description')
      }
      icon={editing ? 'pencil' : 'user-plus'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="player-form" icon={editing ? 'check' : 'plus'}>
            {editing ? t('players.modal.saveEdit') : t('players.add')}
          </Button>
        </>
      }
    >
      <form id="player-form" onSubmit={submit} className="space-y-4">
        <Field label={t('players.form.name')} required>
          <Input
            autoFocus
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({ ...current, name: event.target.value }))
              setError('')
            }}
            placeholder={t('players.form.namePlaceholder')}
            maxLength={90}
            autoComplete="off"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('players.form.class')} hint={t('players.form.classHint')}>
            <Input
              value={form.grade}
              onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
              placeholder={t('players.form.classPlaceholder')}
              maxLength={40}
              autoComplete="off"
            />
          </Field>
          <Field label={t('players.form.rating')} hint={t('players.form.ratingHint')}>
            <Input
              type="number"
              min={0}
              max={3000}
              step={1}
              value={form.rating}
              onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
            />
          </Field>
        </div>
        {duplicate ? (
          <InfoNote tone="amber" icon="alert">
            {t('players.warning.duplicate')}
          </InfoNote>
        ) : null}
        {error ? (
          <InfoNote tone="rose" icon="alert">
            {error}
          </InfoNote>
        ) : null}
        {editing ? (
          <InfoNote icon="info">
            {t('players.info.ratingSeed')}
          </InfoNote>
        ) : null}
      </form>
    </Modal>
  )
}

function BulkImportModal({ open, onClose, onImport, existingNames }) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const parsed = useMemo(() => parsePlayerImport(text), [text])

  const duplicateAgainstField = parsed.players.filter((player) =>
    existingNames.some((name) => name.toLowerCase() === player.name.toLowerCase()),
  ).length

  const reset = () => {
    setText('')
    setFileName('')
    setError('')
  }

  const handleFile = async (file) => {
    if (!file) return
    try {
      const content = await readFileAsText(file)
      setText(content)
      setFileName(file.name)
      setError('')
    } catch {
      setError(t('players.error.fileRead'))
    }
  }

  const submit = () => {
    if (!parsed.players.length) {
      setError(t('players.error.noPlayers'))
      return
    }
    const result = onImport(parsed.players)
    if (!result?.ok) {
      setError(result?.error ?? t('players.error.import'))
      return
    }
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('players.bulk.title')}
      description={t('players.bulk.description')}
      icon="users"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} icon="user-plus" disabled={!parsed.players.length}>
            {t('players.bulk.importCount', { count: parsed.players.length || '' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-[12px] font-semibold text-slate-700">{t('players.bulk.format')}</p>
          <code className="mt-1 block text-[12px] leading-relaxed text-slate-600">
            {t('csv.template.header')}
            <br />
            Nur Aisyah, 5 Amanah, 1400
            <br />
            Muhammad Danish, 5 Bestari
          </code>
          <p className="mt-2 text-[11px] text-slate-500">
            {t('players.bulk.formatHint', { rating: DEFAULT_RATING })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
            <Icon name="upload" size={15} />
            {t('players.bulk.chooseFile')}
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          {fileName ? (
            <Badge tone="emerald" dot>
              {fileName}
            </Badge>
          ) : null}
          <button
            type="button"
            onClick={downloadPlayerTemplate}
            className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {t('players.bulk.downloadTemplate')}
          </button>
        </div>

        <Field
          label={t('players.bulk.pasteLabel')}
          hint={t('players.bulk.detected', { count: parsed.players.length })}
        >
          <Textarea
            rows={8}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setError('')
            }}
            placeholder={'Nur Aisyah binti Kamal, 5 Amanah, 1400\nMuhammad Danish, 5 Bestari, 1320\nTan Wei Ling, 4 Cekal'}
            className="font-mono text-[12px]"
            spellCheck={false}
          />
        </Field>

        {duplicateAgainstField ? (
          <InfoNote tone="amber" icon="alert">
            {t('players.bulk.duplicateWarning', { count: duplicateAgainstField })}
          </InfoNote>
        ) : null}

        {parsed.errors.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[12px] font-bold text-amber-900">
              {t('players.bulk.skipped', { count: parsed.errors.length })}
            </p>
            <ul className="mt-1.5 max-h-24 space-y-1 overflow-y-auto text-[11px] text-amber-800">
              {parsed.errors.slice(0, 8).map((message) => (
                <li key={message}>• {message}</li>
              ))}
              {parsed.errors.length > 8 ? (
                <li>{t('players.bulk.andMore', { count: parsed.errors.length - 8 })}</li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {error ? (
          <InfoNote tone="rose" icon="alert">
            {error}
          </InfoNote>
        ) : null}

        {parsed.players.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                {t('players.bulk.preview')}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('players.bulk.showingOf', {
                  shown: Math.min(6, parsed.players.length),
                  total: parsed.players.length,
                })}
              </p>
            </div>
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 font-bold">{t('players.bulk.name')}</th>
                  <th className="px-3 py-2 font-bold">{t('players.bulk.class')}</th>
                  <th className="px-3 py-2 text-right font-bold">{t('common.rating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.players.slice(0, 6).map((player, index) => (
                  <tr key={`${player.name}-${index}`}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{player.name}</td>
                    <td className="px-3 py-2 text-slate-500">{player.grade || '—'}</td>
                    <td className="tabular px-3 py-2 text-right text-slate-600">{player.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function AttendanceLine({ player }) {
  const { t } = useLanguage()
  if (!player.absences?.length) return null
  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {player.absences.map((round) => (
        <span
          key={round}
          className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200 ring-inset"
        >
          {t('players.attendance.absent', { round })}
        </span>
      ))}
    </span>
  )
}

export function Players() {
  const { t } = useLanguage()
  const {
    players,
    standings,
    addPlayer,
    addPlayers,
    updatePlayer,
    deletePlayer,
    setPlayerStatus,
    notify,
  } = useTournament()

  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [withdrawTarget, setWithdrawTarget] = useState(null)

  const standingsById = useMemo(
    () => new Map(standings.map((row) => [row.id, row])),
    [standings],
  )

  const grades = useMemo(
    () => [...new Set(players.map((player) => player.grade).filter(Boolean))].sort(),
    [players],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return players
      .filter((player) => grade === 'all' || player.grade === grade)
      .filter(
        (player) =>
          !needle ||
          player.name.toLowerCase().includes(needle) ||
          (player.grade ?? '').toLowerCase().includes(needle),
      )
  }, [players, search, grade])

  const activeCount = players.filter((player) => player.status !== 'withdrawn').length

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (player) => {
    setEditing(player)
    setModalOpen(true)
  }

  const handleSave = (data) => {
    if (editing) {
      const result = updatePlayer(editing.id, data)
      if (result.ok) notify(t('players.toast.updated', { name: data.name }))
      return result
    }
    const result = addPlayer(data)
    if (result.ok) notify(t('players.toast.added', { name: data.name }))
    return result
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    const result = deletePlayer(deleteTarget.id)
    if (result.ok) {
      notify(t('players.toast.removed', { name: deleteTarget.name }))
      setDeleteTarget(null)
    } else {
      notify(result.error, 'error')
      setDeleteTarget(null)
    }
  }

  const confirmWithdraw = () => {
    if (!withdrawTarget) return
    setPlayerStatus(withdrawTarget.id, 'withdrawn')
    notify(t('players.toast.withdrawn', { name: withdrawTarget.name }))
    setWithdrawTarget(null)
  }

  const toggleStatus = (player) => {
    if (player.status === 'withdrawn') {
      setPlayerStatus(player.id, 'active')
      notify(t('players.toast.reactivated', { name: player.name }))
    } else {
      setWithdrawTarget(player)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="emerald" dot>
            {t('players.badge.active', { count: activeCount })}
          </Badge>
          <Badge tone="slate">
            {t('players.badge.withdrawn', { count: players.length - activeCount })}
          </Badge>
          <Badge tone="indigo">{t('players.badge.classes', { count: grades.length })}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon="download"
            onClick={() => {
              exportPlayersCsv({ tournament: { name: 'player-list' }, players })
              notify(t('players.toast.exported'))
            }}
            disabled={!players.length}
          >
            {t('players.export')}
          </Button>
          <Button variant="secondary" size="sm" icon="upload" onClick={() => setBulkOpen(true)}>
            {t('players.bulkImport')}
          </Button>
          <Button size="sm" icon="plus" onClick={openAdd}>
            {t('players.add')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title={t('players.list.title')}
          description={t('players.list.description')}
          icon="users"
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Icon
                  name="search"
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('players.search.placeholder')}
                  className="h-9 w-52 py-1.5 pl-9 text-[13px]"
                  aria-label={t('players.search.aria')}
                />
              </div>
              <Select
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="h-9 w-auto py-1.5 text-[13px]"
                aria-label={t('players.filter.aria')}
              >
                <option value="all">{t('players.filter.all')}</option>
                {grades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        <div className="border-b border-slate-100 px-4 py-3 sm:hidden">
          <div className="relative">
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('players.search.placeholder')}
              className="py-2 pl-9 text-[13px]"
              aria-label={t('players.search.aria')}
            />
          </div>
        </div>

        {players.length === 0 ? (
          <EmptyState
            icon="users"
            title={t('players.empty.title')}
            description={t('players.empty.description')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button icon="plus" onClick={openAdd}>
                  {t('players.empty.addFirst')}
                </Button>
                <Button variant="secondary" icon="upload" onClick={() => setBulkOpen(true)}>
                  {t('players.empty.pasteBulk')}
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={t('players.noMatch.title')}
            description={t('players.noMatch.description')}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setGrade('all')
                }}
              >
                {t('players.noMatch.clear')}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                    <th className="px-5 py-3">{t('players.table.seed')}</th>
                    <th className="px-3 py-3">{t('players.table.player')}</th>
                    <th className="px-3 py-3">{t('players.table.class')}</th>
                    <th className="px-3 py-3 text-right">{t('players.table.rating')}</th>
                    <th className="px-3 py-3 text-center">{t('players.table.points')}</th>
                    <th className="px-3 py-3">{t('players.table.status')}</th>
                    <th className="px-5 py-3 text-right">{t('players.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((player) => {
                    const stats = standingsById.get(player.id)
                    return (
                      <tr
                        key={player.id}
                        className={cn(
                          'group transition-colors hover:bg-slate-50/80',
                          player.status === 'withdrawn' && 'opacity-70',
                        )}
                      >
                        <td className="tabular px-5 py-3 text-sm font-bold text-slate-400">
                          {player.seed ?? '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={player.name}
                              tone={player.status === 'withdrawn' ? 'slate' : 'emerald'}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-slate-800">
                                {player.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {stats
                                  ? t('players.record', {
                                      wins: stats.wins,
                                      draws: stats.draws,
                                      losses: stats.losses,
                                    })
                                  : t('players.noGames')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-slate-600">
                          {player.grade || '—'}
                          <AttendanceLine player={player} />
                        </td>
                        <td className="tabular px-3 py-3 text-right text-[12px] font-semibold text-slate-600">
                          {player.rating}
                        </td>
                        <td className="tabular px-3 py-3 text-center text-[13px] font-bold text-slate-800">
                          {formatPoints(stats?.points ?? 0)}
                        </td>
                        <td className="px-3 py-3">
                          {player.status === 'withdrawn' ? (
                            <Badge tone="rose" dot>
                              {t('common.withdrawn')}
                            </Badge>
                          ) : (
                            <Badge tone="emerald" dot>
                              {t('common.active')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              label={t('players.action.edit', { name: player.name })}
                              icon="pencil"
                              onClick={() => openEdit(player)}
                            />
                            <IconButton
                              label={
                                player.status === 'withdrawn'
                                  ? t('players.action.reactivate', { name: player.name })
                                  : t('players.action.withdraw', { name: player.name })
                              }
                              icon={player.status === 'withdrawn' ? 'user-plus' : 'user-minus'}
                              onClick={() => toggleStatus(player)}
                              className={
                                player.status === 'withdrawn' ? 'text-emerald-600' : 'text-amber-600'
                              }
                            />
                            <IconButton
                              label={t('players.action.remove', { name: player.name })}
                              icon="trash"
                              variant="danger-ghost"
                              onClick={() => setDeleteTarget(player)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filtered.map((player) => {
                const stats = standingsById.get(player.id)
                return (
                  <div key={player.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={player.name}
                        tone={player.status === 'withdrawn' ? 'slate' : 'emerald'}
                        className="h-10 w-10 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-800">{player.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          #{player.seed ?? '—'} · {player.grade || t('common.noClass')} · {player.rating}
                        </p>
                        <AttendanceLine player={player} />
                      </div>
                      <div className="text-right">
                        <p className="tabular text-lg leading-none font-black text-slate-900">
                          {formatPoints(stats?.points ?? 0)}
                        </p>
                        <p className="mt-1 text-[10px] font-bold tracking-wide text-slate-400">
                          {t('common.pointsShort')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {player.status === 'withdrawn' ? (
                        <Badge tone="rose" dot>
                          {t('common.withdrawn')}
                        </Badge>
                      ) : (
                        <Badge tone="emerald" dot>
                          {t('common.active')}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1">
                        <Button variant="subtle" size="xs" icon="pencil" onClick={() => openEdit(player)}>
                          {t('players.action.editShort')}
                        </Button>
                        <IconButton
                          label={
                            player.status === 'withdrawn'
                              ? t('players.action.reactivate', { name: player.name })
                              : t('players.action.withdraw', { name: player.name })
                          }
                          icon={player.status === 'withdrawn' ? 'user-plus' : 'user-minus'}
                          onClick={() => toggleStatus(player)}
                          className="text-slate-600"
                        />
                        <IconButton
                          label={t('players.action.remove', { name: player.name })}
                          icon="trash"
                          variant="danger-ghost"
                          onClick={() => setDeleteTarget(player)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-[11px] text-slate-400">
                {t('players.footer.showing', { shown: filtered.length, total: players.length })}
              </p>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                {t('players.footer.attendanceHint')}
              </p>
            </div>
          </>
        )}
      </Card>

      <div className="rounded-2xl border border-slate-200 bg-white/60 px-4 py-3">
        <InfoNote icon="info" tone="slate">
          <span className="font-bold text-slate-700">{t('players.info.withdrawTitle')}</span>{' '}
          {t('players.info.withdrawText')}
        </InfoNote>
      </div>

      <PlayerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        player={editing}
        onSave={handleSave}
        existingNames={players.map((player) => player.name)}
      />
      <BulkImportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        existingNames={players.map((player) => player.name)}
        onImport={(rows) => {
          const result = addPlayers(rows)
          if (result.ok) {
            notify(t('players.toast.imported', { count: result.players.length }), 'success')
          }
          return result
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={
          deleteTarget
            ? t('players.confirm.delete.title', { name: deleteTarget.name })
            : t('players.confirm.delete.titleGeneric')
        }
        description={t('players.confirm.delete.description')}
        confirmLabel={t('players.confirm.delete.confirm')}
        icon="trash"
      />

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={confirmWithdraw}
        title={
          withdrawTarget
            ? t('players.confirm.withdraw.title', { name: withdrawTarget.name })
            : t('players.confirm.withdraw.titleGeneric')
        }
        description={t('players.confirm.withdraw.description')}
        confirmLabel={t('players.confirm.withdraw.confirm')}
        icon="user-minus"
        tone="danger"
      />
    </div>
  )
}
