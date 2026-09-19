import { useMemo, useState } from 'react'
import {
  ROMAN_WEEK,
  addDays,
  formatLongDate,
  isISODate,
  todayISO,
} from '../liturgy/dates'
import { COLOUR_NAMES, resolveLiturgicalDay } from '../liturgy/calendar'
import {
  CELEBRATION_RANK_LABELS,
  HOURS,
  HOUR_META,
  SECTIONS,
  type Hour,
  type SectionId,
} from '../data/types'
import { resolveOffice } from '../data/resolve'
import { useAppState } from '../state/store'
import { announce } from '../state/announce'
import { SectionCard } from './SectionCard'
import { SectionEditorDialog } from './SectionEditorDialog'

interface LookupScreenProps {
  date: string
  hour: Hour
  onDateChange: (date: string) => void
  onHourChange: (hour: Hour) => void
}

export function LookupScreen({ date, hour, onDateChange, onHourChange }: LookupScreenProps) {
  const { file } = useAppState()
  const [editing, setEditing] = useState<SectionId | null>(null)

  const day = useMemo(() => resolveLiturgicalDay(date), [date])
  const office = useMemo(() => resolveOffice(file.entries, day, hour), [file.entries, day, hour])
  const storedCelebration = office.candidates.celebration[0]
  const today = todayISO()
  const missing = SECTIONS.filter((section) => !office.sections[section].present)

  function step(days: number) {
    const next = addDays(date, days)
    onDateChange(next)
    announce(`${formatLongDate(next)}. ${resolveLiturgicalDay(next).title}.`)
  }

  return (
    <div>
      <h2 className="visually-hidden">Look up an office</h2>

      <div className="datebar">
        <button type="button" className="button datebar__step" onClick={() => step(-1)} aria-label="Previous day">
          <span aria-hidden="true">‹</span>
        </button>
        <div className="datebar__date">
          <label htmlFor="lookup-date" className="visually-hidden">
            Date
          </label>
          <input
            type="date"
            id="lookup-date"
            value={date}
            onChange={(event) => {
              if (isISODate(event.target.value)) onDateChange(event.target.value)
            }}
          />
        </div>
        <button type="button" className="button datebar__step" onClick={() => step(1)} aria-label="Next day">
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          className="button button--small"
          onClick={() => {
            onDateChange(today)
            announce(`Today, ${formatLongDate(today)}.`)
          }}
          disabled={date === today}
        >
          Today
        </button>
        <span className="tiny muted">{date === today ? 'Showing today' : formatLongDate(date)}</span>
      </div>

      <div className="hourbar" role="group" aria-label="Hour">
        {HOURS.map((item) => (
          <button
            key={item}
            type="button"
            className="button hourbar__button"
            aria-label={`${HOUR_META[item].label} — ${HOUR_META[item].description} (${HOUR_META[item].traditional})`}
            aria-pressed={hour === item}
            onClick={() => onHourChange(item)}
          >
            <span className="hourbar__label">{HOUR_META[item].label}</span>
            <span className="hourbar__sub">{HOUR_META[item].traditional}</span>
          </button>
        ))}
      </div>

      <article className="daycard" data-colour={day.colour}>
        <p className="daycard__date">{formatLongDate(day.date)}</p>
        <h3 className="daycard__title">{day.title}</h3>
        <dl className="factlist">
          <div>
            <dt>Season</dt>
            <dd>{day.seasonName}</dd>
          </div>
          <div>
            <dt>Week</dt>
            <dd>{day.weekLabel}</dd>
          </div>
          <div>
            <dt>Psalter</dt>
            <dd>Week {ROMAN_WEEK[day.psalterWeek]}</dd>
          </div>
          <div>
            <dt>Weekday</dt>
            <dd>{day.weekdayName}</dd>
          </div>
          <div>
            <dt>Colour</dt>
            <dd>
              <span className="colour-dot" data-colour={day.colour} aria-hidden="true" />
              {COLOUR_NAMES[day.colour]}
            </dd>
          </div>
          <div>
            <dt>Hour</dt>
            <dd>{HOUR_META[hour].description}</dd>
          </div>
          {!day.celebration && storedCelebration?.celebrationName ? (
            <div>
              <dt>Celebration</dt>
              <dd>
                {storedCelebration.celebrationName}
                {storedCelebration.celebrationRank
                  ? ` · ${CELEBRATION_RANK_LABELS[storedCelebration.celebrationRank]}`
                  : ''}
              </dd>
            </div>
          ) : null}
        </dl>
        {day.notes.length > 0 ? (
          <div className="note">
            {day.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
      </article>

      <p className="visually-hidden" role="status">
        {missing.length === 0
          ? 'All four sections are stored for this office.'
          : `${missing.length} of four sections are not yet added.`}
      </p>

      <div className="panel panel--plain">
        {SECTIONS.map((section) => (
          <SectionCard
            key={section}
            section={section}
            resolution={office.sections[section]}
            onEdit={() => setEditing(section)}
          />
        ))}
      </div>

      {editing ? (
        <SectionEditorDialog
          section={editing}
          day={day}
          hour={hour}
          currentEntry={office.sections[editing].entry}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}
