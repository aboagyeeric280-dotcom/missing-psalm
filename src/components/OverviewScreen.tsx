import { useMemo, useState } from 'react'
import { ROMAN_WEEK, formatLongDate, todayISO } from '../liturgy/dates'
import { SEASONS, SEASON_NAMES, resolveLiturgicalDay, type Season } from '../liturgy/calendar'
import {
  HOURS,
  HOUR_META,
  SECTIONS,
  SECTION_META,
  sectionHasContent,
  sectionsPresent,
  type Entry,
  type Hour,
} from '../data/types'
import { resolveOffice } from '../data/resolve'
import { useAppState } from '../state/store'

interface OverviewScreenProps {
  onOpenDay: (date: string, hour: Hour) => void
}

/** How many of the 28 psalter slots (7 weekdays x 4 hours) are covered. */
function psalterCoverage(entries: Entry[], season: Season, psalterWeek: number): number {
  const slots = new Set<string>()
  for (const entry of entries) {
    if (entry.keyType !== 'psalter') continue
    if (entry.season !== season || entry.psalterWeek !== psalterWeek) continue
    if (sectionsPresent(entry).length === 0) continue
    slots.add(`${entry.weekday}-${entry.hour}`)
  }
  return slots.size
}

export function OverviewScreen({ onOpenDay }: OverviewScreenProps) {
  const { file } = useAppState()
  const today = todayISO()
  const day = useMemo(() => resolveLiturgicalDay(today), [today])
  const [season, setSeason] = useState<Season>(day.season)

  const todayOffices = useMemo(
    () => HOURS.map((hour) => ({ hour, office: resolveOffice(file.entries, day, hour) })),
    [file.entries, day],
  )

  const storedToday = todayOffices.reduce(
    (total, item) => total + SECTIONS.filter((section) => item.office.sections[section].present).length,
    0,
  )

  const upcoming = useMemo(
    () =>
      file.entries
        .filter((entry) => entry.keyType === 'date' && entry.date && entry.date >= today)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
        .slice(0, 8),
    [file.entries, today],
  )

  const bySeason = useMemo(() => {
    const counts = new Map<Season, number>()
    for (const entry of file.entries) {
      if (!entry.season) continue
      counts.set(entry.season, (counts.get(entry.season) ?? 0) + 1)
    }
    return counts
  }, [file.entries])

  const byHour = useMemo(() => {
    const counts = new Map<Hour, number>()
    for (const entry of file.entries) counts.set(entry.hour, (counts.get(entry.hour) ?? 0) + 1)
    return counts
  }, [file.entries])

  const sectionTotals = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of file.entries) {
      for (const section of SECTIONS) {
        if (sectionHasContent(entry, section)) counts.set(section, (counts.get(section) ?? 0) + 1)
      }
    }
    return counts
  }, [file.entries])

  return (
    <div>
      <h2 className="panel__title">Where you have got to</h2>

      <section className="panel" aria-labelledby="overview-today">
        <h3 id="overview-today" className="panel__title">
          Today
        </h3>
        <p className="small muted">
          {formatLongDate(today)} · {day.title}
        </p>
        <p className="small" style={{ marginTop: 'var(--space-2)' }}>
          <strong>{storedToday} of 16</strong> sections are stored for today across the four hours.
        </p>

        <ul className="hourlist">
          {todayOffices.map(({ hour, office }) => (
            <li className="hourlist__item" key={hour}>
              <button
                type="button"
                className="button button--small"
                onClick={() => onOpenDay(today, hour)}
              >
                {HOUR_META[hour].label}
                <span className="visually-hidden"> — open this hour</span>
              </button>
              <ul className="hourlist__sections">
                {SECTIONS.map((section) => {
                  const present = office.sections[section].present
                  return (
                    <li key={section}>
                      <span className={present ? 'badge badge--ok' : 'badge'}>
                        <span aria-hidden="true">{present ? '\u2713' : '\u2014'}</span>
                        {SECTION_META[section].shortLabel}
                        <span className="visually-hidden">
                          {present ? ' stored' : ' not yet added'}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="overview-totals">
        <h3 id="overview-totals" className="panel__title">
          What you have stored
        </h3>
        <div className="tally">
          <div className="tally__item">
            <div className="tally__value">{file.entries.length}</div>
            <div className="tally__label">records</div>
          </div>
          {SECTIONS.map((section) => (
            <div className="tally__item" key={section}>
              <div className="tally__value">{sectionTotals.get(section) ?? 0}</div>
              <div className="tally__label">{SECTION_META[section].label.toLowerCase()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="overview-psalter">
        <h3 id="overview-psalter" className="panel__title">
          Psalter coverage
        </h3>
        <div className="field">
          <label htmlFor="overview-season">Season</label>
          <select id="overview-season" value={season} onChange={(event) => setSeason(event.target.value as Season)}>
            {SEASONS.map((item) => (
              <option key={item} value={item}>
                {SEASON_NAMES[item]}
              </option>
            ))}
          </select>
        </div>
        <table className="coverage">
          <caption className="visually-hidden">
            Psalter slots covered in {SEASON_NAMES[season]}, out of 28 per week
          </caption>
          <thead>
            <tr>
              <th scope="col">Psalter week</th>
              <th scope="col">Days and hours covered</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((week) => {
              const covered = psalterCoverage(file.entries, season, week)
              return (
                <tr key={week}>
                  <th scope="row">Week {ROMAN_WEEK[week]}</th>
                  <td>
                    {covered} of 28
                    <span className="meter" aria-hidden="true">
                      <span className="meter__fill" style={{ width: `${(covered / 28) * 100}%` }} />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <div className="grid-2">
        <section className="panel" aria-labelledby="overview-season-counts">
          <h3 id="overview-season-counts" className="panel__title">
            By season
          </h3>
          <table className="coverage">
            <tbody>
              {SEASONS.map((item) => (
                <tr key={item}>
                  <th scope="row">{SEASON_NAMES[item]}</th>
                  <td>{bySeason.get(item) ?? 0}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Exact dates</th>
                <td>{file.entries.filter((entry) => entry.keyType === 'date').length}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="overview-hour-counts">
          <h3 id="overview-hour-counts" className="panel__title">
            By hour
          </h3>
          <table className="coverage">
            <tbody>
              {HOURS.map((item) => (
                <tr key={item}>
                  <th scope="row">{HOUR_META[item].label}</th>
                  <td>{byHour.get(item) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel" aria-labelledby="overview-upcoming">
        <h3 id="overview-upcoming" className="panel__title">
          Exact-date entries coming up
        </h3>
        {upcoming.length === 0 ? (
          <p className="small muted">
            Nothing dated from today onwards. Days such as 17–24 December, the Christmas octave, solemnities and
            feasts are usually stored as exact dates.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {upcoming.map((entry) => (
              <li key={entry.id} style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--rule)' }}>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => onOpenDay(entry.date!, entry.hour)}
                >
                  {formatLongDate(entry.date!)} · {HOUR_META[entry.hour].label}
                </button>
                <span className="tiny muted"> — {resolveLiturgicalDay(entry.date!).title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="small muted">
        A psalter slot counts as covered when any of the four sections is stored for that day and hour. A week has
        seven days and four hours, so 28 slots.
      </p>
    </div>
  )
}
