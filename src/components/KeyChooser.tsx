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
import { HOURS, HOUR_META, KEY_TYPES, type Hour, type KeyType } from '../data/types'
import { explainKey } from '../data/resolve'
import type { EntryKeyInput } from '../state/store'

export type KeyDraft = Required<Pick<EntryKeyInput, 'keyType' | 'hour'>> & {
  season: Season
  psalterWeek: PsalterWeek
  weekday: number
  weekOfSeason: number
  date: string
}

const KEY_TITLES: Record<KeyType, string> = {
  psalter: 'Every four weeks (psalter)',
  week: 'This week of the season',
  date: 'This date only',
}

interface KeyChooserProps {
  value: KeyDraft
  onChange: (next: KeyDraft) => void
  /** Suggest the exact-date option first, e.g. on a solemnity or 17–24 December. */
  recommendDate?: boolean
  legend?: string
}

export function KeyChooser({ value, onChange, recommendDate, legend = 'Where does this apply?' }: KeyChooserProps) {
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
      ) : (
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
      )}

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
