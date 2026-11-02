import { useState } from 'react'
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
  Input,
  Modal,
} from './ui'

export function Teams() {
  const { t } = useLanguage()
  const {
    teams,
    players,
    addTeam,
    updateTeam,
    deleteTeam,
    notify,
  } = useTournament()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const openAdd = () => {
    setEditing(null)
    setName('')
    setModalOpen(true)
  }

  const openEdit = (team) => {
    setEditing(team)
    setName(team.name)
    setModalOpen(true)
  }

  const handleSave = () => {
    const clean = name.trim()
    if (!clean) return
    if (editing) {
      const result = updateTeam(editing.id, { name: clean })
      if (result.ok) {
        notify(t('teams.toast.updated'))
        setModalOpen(false)
      } else {
        notify(result.error, 'error')
      }
    } else {
      const result = addTeam(clean)
      if (result.ok) {
        notify(t('teams.toast.added'))
        setModalOpen(false)
      } else {
        notify(result.error, 'error')
      }
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const result = deleteTeam(deleteTarget.id)
    if (result.ok) {
      notify(t('teams.toast.deleted'))
    } else {
      notify(result.error, 'error')
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <Card>
        <CardHeader
          title={t('teams.list.title')}
          description={t('page.teams.subtitle')}
          icon="users"
          action={
            <Button size="sm" icon="plus" onClick={openAdd}>
              {t('teams.add')}
            </Button>
          }
        />
        {teams.length === 0 ? (
          <EmptyState
            icon="users"
            title={t('teams.empty.title')}
            description={t('teams.empty.description')}
            action={
              <Button size="sm" icon="plus" onClick={openAdd}>
                {t('teams.add')}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {teams.map((team) => {
              const members = players.filter((player) => player.teamId === team.id)
              return (
                <div key={team.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-slate-800">{team.name}</p>
                    <p className="text-[12px] text-slate-500">
                      {members.length
                        ? t('teams.membersCount', { count: members.length })
                        : t('teams.noMembers')}
                    </p>
                    {members.length ? (
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {members.map((member) => member.name).join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" size="sm" icon="pencil" onClick={() => openEdit(team)}>
                      {t('teams.action.edit')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="trash"
                      onClick={() => setDeleteTarget(team)}
                    >
                      {t('teams.action.delete')}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('teams.modal.edit.title') : t('teams.modal.add.title')}
        icon="users"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {t('teams.form.save')}
            </Button>
          </>
        }
      >
        <Field label={t('teams.form.name')} required>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('teams.form.name')}
            autoFocus
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t('teams.confirm.delete.title')}
        description={t('teams.confirm.delete.description')}
        confirmLabel={t('teams.confirm.delete.confirm')}
        tone="danger"
        onConfirm={handleDelete}
      />
    </div>
  )
}