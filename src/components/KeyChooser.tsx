import { useId } from 'react'
import { ROMAN_WEEK, WEEKDAY_NAMES } from '../liturgy/dates'
import {
  SEASONS,
  SEASON_NAMES,
  weekLabelFor,
  weeksInSeason,
  type PsalterWeek,
  type Season,
} from '../liturgy/calendar'
import {
  CALENDAR_SCOPES,
  CALENDAR_SCOPE_LABELS,
  CELEBRATION_RANKS,
  CELEBRATION_RANK_LABELS,
  HOURS,
  HOUR_META,
  KEY_TYPES,
  type CalendarScope,
  type CelebrationRank,
  type Hour,
  type KeyType,
} from '../data/types'
import { explainKey } from '../data/resolve'
import type { EntryKeyInput } from '../state/store'

export type KeyDraft = Required<Pick<EntryKeyInput, 'keyType' | 'hour'>> & {
  season: Season
  psalterWeek: PsalterWeek
  weekday: number
  weekOfSeason: number
  celebrationId: string
  celebrationName: string
  celebrationRank: CelebrationRank
  calendarScope: CalendarScope
  celebrationMonth: number
  celebrationDay: number
  date: string
}

const KEY_TITLES: Record<KeyType, string> = {
  psalter: 'Every four weeks (psalter)',
  week: 'This week of the season',
  celebration: 'This celebration each year',
  date: 'This date only',
}

interface KeyChooserProps {
  value: KeyDraft
  onChange: (next: KeyDraft) => void
  /** Suggest the exact-date option first, e.g. on a solemnity or 17–24 December. */
  recommendDate?: boolean
  /** Suggest the annual celebration key when the calendar identifies one. */
  recommendCelebration?: boolean
  legend?: string
}

export function KeyChooser({
  value,
  onChange,
  recommendDate,
  recommendCelebration,
  legend = 'Where does this apply?',
}: KeyChooserProps) {
  const name = useId()
  return (
    <fieldset>
      <legend>{legend}</legend>
      {KEY_TYPES.map((keyType) => (
        <label className="choice" key={keyType} htmlFor={`${name}-${keyType}`}>
          <span className="choice__row">
            <input
              type="radio"
              id={`${name}-${keyType}`}
              name={name}
              value={keyType}
              checked={value.keyType === keyType}
              onChange={() => onChange({ ...value, keyType })}
            />
            <span>
              <span className="choice__label">
                {KEY_TITLES[keyType]}
                {recommendDate && keyType === 'date' ? ' — suggested for today' : ''}
                {recommendCelebration && keyType === 'celebration' ? ' — suggested for today' : ''}
              </span>
              <span className="choice__explain">{explainKey(keyType, value)}</span>
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

interface KeyDetailsProps {
  value: KeyDraft
  onChange: (next: KeyDraft) => void
  showHour?: boolean
}

/** The advanced controls. Everything here is filled in from the date by default. */
export function KeyDetails({ value, onChange, showHour = true }: KeyDetailsProps) {
  const ids = useId()
  return (
    <div className="grid-2">
      {showHour ? (
        <div className="field">
          <label htmlFor={`${ids}-hour`}>Hour</label>
          <select
            id={`${ids}-hour`}
            value={value.hour}
            onChange={(event) => onChange({ ...value, hour: event.target.value as Hour })}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {HOUR_META[hour].label} — {HOUR_META[hour].description}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {value.keyType === 'date' ? (
        <div className="field">
          <label htmlFor={`${ids}-date`}>Date</label>
          <input
            type="date"
            id={`${ids}-date`}
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
          />
        </div>
      ) : value.keyType !== 'celebration' ? (
        <div className="field">
          <label htmlFor={`${ids}-season`}>Season</label>
          <select
            id={`${ids}-season`}
            value={value.season}
            onChange={(event) => {
              const season = event.target.value as Season
              const weeks = weeksInSeason(season)
              const weekOfSeason = weeks.includes(value.weekOfSeason) ? value.weekOfSeason : weeks[0]
              onChange({ ...value, season, weekOfSeason })
            }}
          >
            {SEASONS.map((season) => (
              <option key={season} value={season}>
                {SEASON_NAMES[season]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {value.keyType === 'celebration' ? (
        <>
          <div className="field grid-span-2">
            <label htmlFor={`${ids}-celebration-name`}>Celebration name</label>
            <input
              type="text"
              id={`${ids}-celebration-name`}
              value={value.celebrationName}
              placeholder="e.g. Saint Thérèse of the Child Jesus"
              onChange={(event) => onChange({ ...value, celebrationName: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${ids}-celebration-rank`}>Rank</label>
            <select
              id={`${ids}-celebration-rank`}
              value={value.celebrationRank}
              onChange={(event) =>
                onChange({ ...value, celebrationRank: event.target.value as CelebrationRank })
              }
            >
              {CELEBRATION_RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {CELEBRATION_RANK_LABELS[rank]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${ids}-calendar-scope`}>Calendar</label>
            <select
              id={`${ids}-calendar-scope`}
              value={value.calendarScope}
              onChange={(event) =>
                onChange({ ...value, calendarScope: event.target.value as CalendarScope })
              }
            >
              {CALENDAR_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {CALENDAR_SCOPE_LABELS[scope]}
                </option>
              ))}
            </select>
          </div>

          {value.celebrationId ? (
            <p className="small muted grid-span-2">
              This celebration is already recognised by the calendar. Its date will move automatically when the
              calendar date moves.
            </p>
          ) : (
            <>
              <div className="field">
                <label htmlFor={`${ids}-celebration-month`}>Month</label>
                <select
                  id={`${ids}-celebration-month`}
                  value={value.celebrationMonth}
                  onChange={(event) => onChange({ ...value, celebrationMonth: Number(event.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
                        new Date(Date.UTC(2024, month - 1, 1)),
                      )}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`${ids}-celebration-day`}>Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  id={`${ids}-celebration-day`}
                  value={value.celebrationDay}
                  onChange={(event) => onChange({ ...value, celebrationDay: Number(event.target.value) })}
                />
              </div>
              <p className="small muted grid-span-2">
                This is an annual date. If the celebration is transferred in a particular year, add an exact-date
                entry for that year.
              </p>
            </>
          )}
        </>
      ) : null}

      {value.keyType === 'psalter' ? (
        <>
          <div className="field">
            <label htmlFor={`${ids}-psalter`}>Psalter week</label>
            <select
              id={`${ids}-psalter`}
              value={value.psalterWeek}
              onChange={(event) =>
                onChange({ ...value, psalterWeek: Number(event.target.value) as PsalterWeek })
              }
            >
              {[1, 2, 3, 4].map((week) => (
                <option key={week} value={week}>
                  Week {ROMAN_WEEK[week]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${ids}-weekday`}>Weekday</label>
            <select
              id={`${ids}-weekday`}
              value={value.weekday}
              onChange={(event) => onChange({ ...value, weekday: Number(event.target.value) })}
            >
              {WEEKDAY_NAMES.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {value.keyType === 'week' ? (
        <div className="field">
          <label htmlFor={`${ids}-week`}>Week of the season</label>
          <select
            id={`${ids}-week`}
            value={value.weekOfSeason}
            onChange={(event) => onChange({ ...value, weekOfSeason: Number(event.target.value) })}
          >
            {weeksInSeason(value.season).map((week) => (
              <option key={week} value={week}>
                {weekLabelFor(value.season, week)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}
