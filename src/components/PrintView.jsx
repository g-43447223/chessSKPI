import { useEffect, useMemo, useState } from 'react'
import { computeStandings, roundProgress } from '../lib/stats'
import { formatDate, formatPoints } from '../lib/utils'
import { useLanguage } from '../state/LanguageProvider'
import { useTournament } from '../state/TournamentProvider'
import { Icon, KnightMark } from './Icon'
import { Button, Toggle } from './ui'

function SheetHeader({ tournament, label, round, subtitle, t }) {
  return (
    <header className="flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-3">
      <div className="min-w-0">
        <p className="text-[8pt] font-bold tracking-[0.18em] text-slate-500 uppercase">
          {label}
        </p>
        <h1 className="mt-1 text-[17pt] leading-tight font-black text-slate-900">
          {tournament.name}
        </h1>
        <p className="mt-1 text-[9pt] text-slate-600">
          {[tournament.venue, formatDate(tournament.date), subtitle].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {round ? (
          <>
            <p className="text-[8pt] font-bold tracking-[0.16em] text-slate-500 uppercase">{t('print.sheet.round')}</p>
            <p className="text-[26pt] leading-none font-black text-slate-900">{round.number}</p>
            <p className="mt-1 text-[8pt] font-semibold tracking-wide text-slate-500 uppercase">
              {round.status === 'locked' ? t('print.sheet.final') : t('print.sheet.pairing')}
            </p>
          </>
        ) : (
          <KnightMark className="ml-auto h-14 w-14 text-slate-900" />
        )}
      </div>
    </header>
  )
}

function PairingSheet({ round, playersById, tournament, showRatings, showResults, t, locale }) {
  const progress = roundProgress(round)
  return (
    <section className="print-sheet">
      <SheetHeader
        tournament={tournament}
        label={t('print.sheet.official')}
        round={round}
        subtitle={t('print.sheet.boards', {
          boards: t('common.boardCount', { count: progress.total }),
          format:
            tournament.format === 'roundrobin'
              ? t('format.roundrobin.label')
              : t('format.swiss.label'),
        })}
        t={t}
      />

      <table className="print-table mt-5">
        <thead>
          <tr>
            <th style={{ width: '9%' }}>{t('print.table.board')}</th>
            <th style={{ width: '29%' }}>{t('print.table.white')}</th>
            {showRatings ? <th style={{ width: '8%', textAlign: 'right' }}>{t('print.table.rating')}</th> : null}
            <th style={{ width: '18%', textAlign: 'center' }}>{t('print.table.result')}</th>
            <th style={{ width: '29%' }}>{t('print.table.black')}</th>
            {showRatings ? <th style={{ width: '8%', textAlign: 'right' }}>{t('print.table.rating')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {round.pairings.map((pairing) => {
            if (pairing.byePlayerId) {
              const player = playersById.get(pairing.byePlayerId)
              return (
                <tr key={pairing.id}>
                  <td className="tabular font-bold">{pairing.board}</td>
                  <td colSpan={showRatings ? 5 : 3}>
                    <span className="font-bold">BYE</span>
                    <span className="ml-2">{player?.name ?? t('print.bye.unknownPlayer')}</span>
                    <span className="ml-2 text-slate-500">{t('print.bye.onePoint')}</span>
                  </td>
                </tr>
              )
            }
            const white = playersById.get(pairing.whiteId)
            const black = playersById.get(pairing.blackId)
            return (
              <tr key={pairing.id}>
                <td className="tabular font-bold">{pairing.board}</td>
                <td>
                  <span className="font-semibold">{white?.name ?? '—'}</span>
                  <span className="block text-[8pt] text-slate-500">{white?.grade || ''}</span>
                </td>
                {showRatings ? (
                  <td className="tabular" style={{ textAlign: 'right' }}>
                    {white?.rating ?? ''}
                  </td>
                ) : null}
                <td style={{ textAlign: 'center' }}>
                  {showResults && pairing.result ? (
                    <span className="tabular text-[10pt] font-bold">
                      {pairing.result === '0.5-0.5' ? '½–½' : pairing.result}
                    </span>
                  ) : (
                    <span className="result-box" aria-label={t('print.writeResult')} />
                  )}
                </td>
                <td>
                  <span className="font-semibold">{black?.name ?? '—'}</span>
                  <span className="block text-[8pt] text-slate-500">{black?.grade || ''}</span>
                </td>
                {showRatings ? (
                  <td className="tabular" style={{ textAlign: 'right' }}>
                    {black?.rating ?? ''}
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-4 rounded-sm border border-slate-400 p-2 text-[8.5pt] leading-relaxed text-slate-700">
        <span className="font-bold">{t('print.scoring.title')}</span> {t('print.scoring.text')}
      </div>

      <footer className="mt-8 flex items-end justify-between gap-8 text-[8.5pt] text-slate-600">
        <div className="flex-1">
          <p className="border-t border-slate-500 pt-1.5">
            {t('print.footer.arbiter')} <span className="font-semibold">{tournament.arbiter || '________________________'}</span>
          </p>
        </div>
        <div className="flex-1">
          <p className="border-t border-slate-500 pt-1.5">{t('print.footer.signature')}</p>
        </div>
        <div className="w-36">
          <p className="border-t border-slate-500 pt-1.5">{t('print.footer.date')}</p>
        </div>
      </footer>

      <p className="mt-4 text-right text-[7.5pt] text-slate-400">
        {t('print.generated', {
          time: new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
        })}
      </p>
    </section>
  )
}

function StandingsSheet({ rows, tournament, round, label, t, locale }) {
  return (
    <section className="print-sheet">
      <SheetHeader
        tournament={tournament}
        label={label}
        round={null}
        subtitle={
          round
            ? t('print.standings.afterRound', {
                round: round.number,
                players: t('common.playerCount', { count: rows.length }),
              })
            : t('print.standings.final', {
                players: t('common.playerCount', { count: rows.length }),
              })
        }
        t={t}
      />
      <table className="print-table mt-5">
        <thead>
          <tr>
            <th style={{ width: '7%' }}>{t('print.table.rank')}</th>
            <th>{t('print.table.player')}</th>
            <th style={{ width: '16%' }}>{t('print.table.class')}</th>
            {round ? null : <th style={{ width: '9%', textAlign: 'right' }}>{t('print.table.rating')}</th>}
            <th style={{ width: '10%', textAlign: 'right' }}>{t('print.table.points')}</th>
            <th style={{ width: '12%', textAlign: 'right' }}>{t('standings.table.bhc1')}</th>
            <th style={{ width: '10%', textAlign: 'right' }}>{t('standings.table.sb')}</th>
            <th style={{ width: '11%', textAlign: 'center' }}>{t('print.table.wdl')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="tabular font-bold">{row.rank}</td>
              <td>
                <span className="font-semibold">{row.name}</span>
                {row.status === 'withdrawn' ? (
                  <span className="ml-1 text-[8pt] text-slate-500">{t('print.standings.withdrawn')}</span>
                ) : null}
              </td>
              <td>{row.grade || '—'}</td>
              {round ? null : <td className="tabular" style={{ textAlign: 'right' }}>{row.rating}</td>}
              <td className="tabular font-bold" style={{ textAlign: 'right' }}>
                {formatPoints(row.points)}
              </td>
              <td className="tabular" style={{ textAlign: 'right' }}>
                {formatPoints(row.buchholzCut1)}
              </td>
              <td className="tabular" style={{ textAlign: 'right' }}>
                {formatPoints(row.sonnebornBerger)}
              </td>
              <td className="tabular" style={{ textAlign: 'center' }}>
                {row.wins}-{row.draws}-{row.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-3 gap-3 text-[8.5pt] text-slate-600">
        <p>
          <span className="font-bold">{t('print.tiebreak.1')}</span> {t('print.tiebreak.buchholz')}
        </p>
        <p>
          <span className="font-bold">{t('print.tiebreak.2')}</span> {t('print.tiebreak.direct')}
        </p>
        <p>
          <span className="font-bold">{t('print.tiebreak.3')}</span> {t('print.tiebreak.sb')}
        </p>
      </div>

      <footer className="mt-10 flex items-end justify-between gap-8 text-[8.5pt] text-slate-600">
        <div className="flex-1">
          <p className="border-t border-slate-500 pt-1.5">
            {t('print.footer.arbiter')} <span className="font-semibold">{tournament.arbiter || '________________________'}</span>
          </p>
        </div>
        <div className="flex-1">
          <p className="border-t border-slate-500 pt-1.5">{t('print.footer.stamp')}</p>
        </div>
      </footer>
      <p className="mt-4 text-right text-[7.5pt] text-slate-400">
        {t('print.generated', {
          time: new Date().toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
        })}
      </p>
    </section>
  )
}

export function PrintView({ roundNumber, onClose }) {
  const { t, locale } = useLanguage()
  const { rounds, players, tournament, settings } = useTournament()
  const [includeStandings, setIncludeStandings] = useState(settings.includeStandingsOnPrint ?? true)
  const [showResults, setShowResults] = useState(false)
  const [showRatings, setShowRatings] = useState(settings.showRatingsOnPrint ?? true)

  const round = roundNumber ? rounds.find((item) => item.number === roundNumber) ?? null : null
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])

  const standingsRows = useMemo(() => {
    const relevantRounds = round
      ? rounds.filter((item) => item.number <= round.number)
      : rounds
    return computeStandings(players, relevantRounds)
  }, [players, rounds, round])

  useEffect(() => {
    const previous = document.title
    document.title = round
      ? t('print.documentTitle.round', { tournament: tournament.name, round: round.number })
      : t('print.documentTitle.standings', { tournament: tournament.name })
    return () => {
      document.title = previous
    }
  }, [tournament.name, round, t])

  return (
    <div className="min-h-dvh bg-slate-300/70">
      <div className="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Button variant="secondary" size="sm" icon="arrow-left" onClick={onClose}>
            {t('print.preview.back')}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-800">
              {round ? t('print.preview.pairingTitle', { round: round.number }) : t('print.preview.standingsTitle')}
            </p>
            <p className="text-[11px] text-slate-500">
              {t('print.preview.hint')}
            </p>
          </div>
          <div className="hidden items-center gap-4 lg:flex">
            <div className="w-48">
              <Toggle
                checked={showRatings}
                onChange={setShowRatings}
                label={t('print.toggle.ratings')}
              />
            </div>
            {round ? (
              <div className="w-44">
                <Toggle
                  checked={showResults}
                  onChange={setShowResults}
                  label={t('print.toggle.results')}
                />
              </div>
            ) : null}
            <div className="w-52">
              <Toggle
                checked={includeStandings}
                onChange={setIncludeStandings}
                label={t('print.toggle.standings')}
              />
            </div>
          </div>
          <Button icon="printer" onClick={() => window.print()}>
            {t('print.action.print')}
          </Button>
        </div>
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 pb-3 lg:hidden">
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={showRatings}
              onChange={(event) => setShowRatings(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            {t('print.toggle.ratingsShort')}
          </label>
          {round ? (
            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={showResults}
                onChange={(event) => setShowResults(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              {t('print.toggle.resultsShort')}
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={includeStandings}
              onChange={(event) => setIncludeStandings(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            {t('print.toggle.standingsShort')}
          </label>
        </div>
      </div>

      <div className="print-preview flex flex-col items-center gap-6 overflow-x-auto px-2 py-6 sm:px-6">
        {round ? (
          <PairingSheet
            round={round}
            playersById={playersById}
            tournament={tournament}
            showRatings={showRatings}
            showResults={showResults}
            t={t}
            locale={locale}
          />
        ) : null}

        {includeStandings ? (
          <StandingsSheet
            rows={standingsRows}
            tournament={tournament}
            round={round}
            label={round ? t('print.standings.afterThisRound') : t('print.standings.officialFinal')}
            t={t}
            locale={locale}
          />
        ) : null}

        {!round && !includeStandings ? (
          <div className="no-print rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow">
            {t('print.empty')}
          </div>
        ) : null}
      </div>

      <div className="no-print flex items-center justify-center gap-2 pb-8 text-[11px] text-slate-500">
        <Icon name="info" size={14} />
        {t('print.tip')}
      </div>
    </div>
  )
}
