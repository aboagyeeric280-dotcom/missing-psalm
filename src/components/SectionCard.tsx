import { ROMAN_WEEK, WEEKDAY_NAMES, formatDateOnly } from '../liturgy/dates'
import { SEASON_NAMES, weekLabelFor } from '../liturgy/calendar'
import {
  CALENDAR_SCOPE_LABELS,
  CELEBRATION_RANK_LABELS,
  SECTION_META,
  type Entry,
  type SectionId,
} from '../data/types'
import type { SectionResolution } from '../data/resolve'
import { describeKey, formatAnnualDate } from '../data/resolve'

/** Where a section came from, in words rather than by colour alone. */
function sourceSummary(entry: Entry): { badge: string; detail: string; className: string } {
  switch (entry.keyType) {
    case 'date':
      return {
        badge: 'Exact date',
        detail: `${entry.date ? formatDateOnly(entry.date) : 'this date'} only — it does not repeat`,
        className: 'badge badge--date',
      }
    case 'week':
      return {
        badge: 'Week',
        detail:
          entry.season && entry.weekOfSeason !== undefined
            ? `${weekLabelFor(entry.season, entry.weekOfSeason)} — repeats each year in that week`
            : 'a week of the season',
        className: 'badge badge--week',
      }
    case 'celebration':
      return {
        badge: entry.celebrationRank
          ? CELEBRATION_RANK_LABELS[entry.celebrationRank]
          : 'Celebration',
        detail: `${entry.celebrationName || 'Celebration'} — ${
          entry.celebrationId
            ? 'follows its calendar date'
            : entry.celebrationMonth && entry.celebrationDay
              ? `repeats every year on ${formatAnnualDate(entry.celebrationMonth, entry.celebrationDay)}`
              : 'annual celebration'
        }${entry.calendarScope ? ` · ${CALENDAR_SCOPE_LABELS[entry.calendarScope]}` : ''}`,
        className: 'badge badge--celebration',
      }
    case 'psalter':
    default:
      return {
        badge: `Psalter ${ROMAN_WEEK[entry.psalterWeek ?? 1]}`,
        detail: `${entry.season ? SEASON_NAMES[entry.season] : ''}, ${
          entry.weekday === undefined ? '' : WEEKDAY_NAMES[entry.weekday]
        } — repeats every four weeks`,
        className: 'badge badge--psalter',
      }
  }
}

interface SectionCardProps {
  section: SectionId
  resolution: SectionResolution
  onEdit: () => void
}

export function SectionCard({ section, resolution, onEdit }: SectionCardProps) {
  const meta = SECTION_META[section]
  const entry = resolution.entry

  if (!entry) {
    return (
      <section className="section" aria-labelledby={`section-${section}`}>
        <div className="section__head">
          <h3 className="section__title" id={`section-${section}`}>
            {meta.label}
          </h3>
        </div>
        <button
          type="button"
          className="section__empty"
          onClick={onEdit}
          aria-label={`Add the ${meta.label.toLowerCase()} for this day and hour`}
        >
          <strong>Not yet added — tap to add it</strong>
          <span className="small">Nothing is stored for this day and hour yet.</span>
        </button>
      </section>
    )
  }

  const source = sourceSummary(entry)

  return (
    <section className="section" aria-labelledby={`section-${section}`}>
      <div className="section__head">
        <h3 className="section__title" id={`section-${section}`}>
          {meta.label}
        </h3>
        <button
          type="button"
          className="button button--small"
          onClick={onEdit}
          aria-label={`Edit the ${meta.label.toLowerCase()}`}
        >
          Edit
        </button>
      </div>

      {section === 'reading' ? (
        <>
          {entry.reference ? <p className="section__reference">{entry.reference}</p> : null}
          <div className="section__body">{entry.readingText}</div>
          {entry.translation ? (
            <p className="section__translation">Translation: {entry.translation}</p>
          ) : (
            <p className="section__translation">Translation not recorded.</p>
          )}
        </>
      ) : (
        <div className="section__body">{entry[meta.fields[0]]}</div>
      )}

      <div className="section__meta">
        <span className={source.className}>{source.badge}</span>
        <span className="tiny muted">{source.detail}</span>
        {entry.source === 'example' ? <span className="badge badge--example">Example text</span> : null}
      </div>

      {resolution.overridden.length > 0 ? (
        <p className="tiny muted" style={{ marginTop: 'var(--space-2)' }}>
          Overrides {resolution.overridden.map((item) => describeKey(item)).join('; ')} — that material is kept and
          still appears on its own days.
        </p>
      ) : null}

      {resolution.duplicates.length > 0 ? (
        <p className="tiny" style={{ marginTop: 'var(--space-2)', color: 'var(--danger)' }}>
          {resolution.duplicates.length} other record{resolution.duplicates.length === 1 ? '' : 's'} shares this key.
          The most recently edited one is shown. See the Library to tidy this up.
        </p>
      ) : null}
    </section>
  )
}
