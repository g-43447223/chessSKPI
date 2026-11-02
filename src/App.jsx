import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Dashboard } from './components/Dashboard'
import { DataBackup } from './components/DataBackup'
import { Pairings } from './components/Pairings'
import { Players } from './components/Players'
import { PrintView } from './components/PrintView'
import { ProjectorView } from './components/ProjectorView'
import { Settings } from './components/Settings'
import { Standings } from './components/Standings'
import { Teams } from './components/Teams'
import { Toasts } from './components/ui'
import { LanguageProvider, useLanguage } from './state/LanguageProvider'
import { TournamentProvider, useTournament } from './state/TournamentProvider'

const PAGE_TITLES = {
  dashboard: 'page.dashboard.title',
  players: 'page.players.title',
  teams: 'page.teams.title',
  pairings: 'page.pairings.title',
  standings: 'page.standings.title',
  data: 'page.data.title',
  settings: 'page.settings.title',
}

function TournamentApp() {
  const { tournament, toasts, dismissToast } = useTournament()
  const { t, language } = useLanguage()
  const [page, setPage] = useState('dashboard')
  const [projectorOpen, setProjectorOpen] = useState(false)
  // undefined = closed, null = standings-only sheet, number = that round's sheet.
  const [printTarget, setPrintTarget] = useState(undefined)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [page])

  useEffect(() => {
    const pageTitle = t(PAGE_TITLES[page] ?? 'page.dashboard.title')
    document.title = t('app.documentTitle', {
      page: pageTitle,
      tournament: tournament.name,
    })
  }, [page, tournament.name, t, language])

  if (printTarget !== undefined) {
    return (
      <>
        <PrintView
          scope={printTarget?.scope ?? 'individual'}
          roundNumber={printTarget?.round ?? null}
          onClose={() => setPrintTarget(undefined)}
        />
        <Toasts toasts={toasts} onDismiss={dismissToast} />
      </>
    )
  }

  const renderPage = () => {
    switch (page) {
      case 'players':
        return <Players />
      case 'teams':
        return <Teams />
      case 'pairings':
        return <Pairings onPrint={setPrintTarget} />
      case 'standings':
        return (
          <Standings
            onProjector={() => setProjectorOpen(true)}
            onPrint={setPrintTarget}
          />
        )
      case 'data':
        return <DataBackup />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={setPage} />
    }
  }

  return (
    <>
      <AppShell
        page={page}
        onNavigate={setPage}
        onProjector={() => setProjectorOpen(true)}
      >
        {renderPage()}
      </AppShell>
      {projectorOpen ? <ProjectorView onClose={() => setProjectorOpen(false)} /> : null}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <TournamentProvider>
        <TournamentApp />
      </TournamentProvider>
    </LanguageProvider>
  )
}
