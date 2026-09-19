/**
 * Matching and resolution.
 *
 * The four sections resolve independently. For each section the most specific
 * record that actually contains that section wins:
 *
 *   exact date  >  celebration  >  week of season  >  psalter
 *
 * A more specific record overrides only the sections it contains; it never hides
 * the other sections coming from a more general record.
 */

import { ROMAN_WEEK, WEEKDAY_NAMES, formatDateOnly } from '../liturgy/dates'
import { celebrationIdFor } from '../liturgy/celebrations'
import { SEASON_NAMES, weekKeyPhrase, type LiturgicalDay, type Season } from '../liturgy/calendar'
import {
  CELEBRATION_RANK_LABELS,
  HOUR_META,
  KEY_TYPE_LABELS,
  SECTIONS,
  sectionHasContent,
  type Entry,
  type Hour,
  type KeyType,
  type SectionId,
} from './types'

export interface SectionResolution {
  section: SectionId
  present: boolean
  entry?: Entry
  keyType?: KeyType
  /** Records that also supply this section but lost on precedence. */
  overridden: Entry[]
  /** Records sharing the winner's key that also supply this section. */
  duplicates: Entry[]
}

export interface ResolvedOffice {
  day: LiturgicalDay
  hour: Hour
  sections: Record<SectionId, SectionResolution>
  candidates: Record<KeyType, Entry[]>
}

export function entryMatchesDay(entry: Entry, day: LiturgicalDay, hour: Hour): boolean {
  if (entry.hour !== hour) return false
  switch (entry.keyType) {
    case 'date':
      return Boolean(entry.date) && entry.date === day.date
    case 'celebration':
      if (entry.celebrationId) {
        return day.celebration
          ? entry.celebrationId === celebrationIdFor(day.celebration.name)
          : false
      }
      return (
        entry.celebrationMonth === Number(day.date.slice(5, 7)) &&
        entry.celebrationDay === Number(day.date.slice(8, 10))
      )
    case 'week':
      return entry.season === day.season && entry.weekOfSeason === day.weekOfSeason
    case 'psalter':
      return (
        entry.season === day.season &&
        entry.psalterWeek === day.psalterWeek &&
        entry.weekday === day.weekday
      )
    default:
      return false
  }
}

function byRecency(a: Entry, b: Entry): number {
  return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
}

const PRIORITY_ORDER: KeyType[] = ['date', 'celebration', 'week', 'psalter']

export function resolveOffice(entries: Entry[], day: LiturgicalDay, hour: Hour): ResolvedOffice {
  const candidates: Record<KeyType, Entry[]> = { date: [], celebration: [], week: [], psalter: [] }
  for (const entry of entries) {
    if (entryMatchesDay(entry, day, hour)) candidates[entry.keyType].push(entry)
  }
  for (const keyType of PRIORITY_ORDER) candidates[keyType].sort(byRecency)

  const sections = {} as Record<SectionId, SectionResolution>
  for (const section of SECTIONS) {
    let winner: Entry | undefined
    let winnerKeyType: KeyType | undefined
    const overridden: Entry[] = []
    const duplicates: Entry[] = []

    for (const keyType of PRIORITY_ORDER) {
      for (const entry of candidates[keyType]) {
        if (!sectionHasContent(entry, section)) continue
        if (!winner) {
          winner = entry
          winnerKeyType = keyType
        } else if (keyType === winnerKeyType) {
          duplicates.push(entry)
        } else {
          overridden.push(entry)
        }
      }
    }

    sections[section] = {
      section,
      present: Boolean(winner),
      entry: winner,
      keyType: winnerKeyType,
      overridden,
      duplicates,
    }
  }

  return { day, hour, sections, candidates }
}

/** Short badge text, e.g. "Psalter I · Monday". */
export function keyBadge(entry: Entry): string {
  switch (entry.keyType) {
    case 'date':
      return entry.date ? formatDateOnly(entry.date) : 'Exact date'
    case 'celebration':
      return entry.celebrationName || 'Celebration'
    case 'week':
      return entry.weekOfSeason === undefined ? 'Week' : `Week ${entry.weekOfSeason}`
    case 'psalter':
    default:
      return `Psalter ${ROMAN_WEEK[entry.psalterWeek ?? 1]}${
        entry.weekday === undefined ? '' : ` · ${WEEKDAY_NAMES[entry.weekday]}`
      }`
  }
}

/** Full description of what an entry is keyed to. */
export function describeKey(entry: Entry): string {
  const hour = HOUR_META[entry.hour].label
  switch (entry.keyType) {
    case 'date':
      return `${entry.date ? formatDateOnly(entry.date) : 'No date set'} · ${hour}`
    case 'celebration':
      return `${entry.celebrationName || 'Unnamed celebration'} · ${celebrationRankLabel(entry)} · ${hour}`
    case 'week':
      return `${seasonLabel(entry.season)} · ${
        entry.weekOfSeason === undefined ? 'No week set' : `week ${entry.weekOfSeason}`
      } · ${hour}`
    case 'psalter':
    default:
      return `${seasonLabel(entry.season)} · Psalter week ${ROMAN_WEEK[entry.psalterWeek ?? 1]} · ${
        entry.weekday === undefined ? 'No weekday set' : WEEKDAY_NAMES[entry.weekday]
      } · ${hour}`
  }
}

function seasonLabel(season?: Season): string {
  return season ? SEASON_NAMES[season] : 'No season set'
}

/** Plain-language sentence describing when a key applies. Used in the editor. */
export function explainKey(
  keyType: KeyType,
  options: {
    season?: Season
    psalterWeek?: number
    weekday?: number
    weekOfSeason?: number
    celebrationId?: string
    celebrationName?: string
    celebrationRank?: Entry['celebrationRank']
    celebrationMonth?: number
    celebrationDay?: number
    date?: string
    hour: Hour
  },
): string {
  const hour = HOUR_META[options.hour].label
  switch (keyType) {
    case 'psalter': {
      const weekday = options.weekday === undefined ? 'that weekday' : WEEKDAY_NAMES[options.weekday]
      const season = options.season ? SEASON_NAMES[options.season] : 'that season'
      return `This will repeat every four weeks on ${weekday} at ${hour}, in ${season}.`
    }
    case 'week': {
      if (!options.season || options.weekOfSeason === undefined) {
        return `This will apply to one week of the season at ${hour}.`
      }
      return `This applies only to ${weekKeyPhrase(options.season, options.weekOfSeason)}, at ${hour}.`
    }
    case 'celebration': {
      const name = options.celebrationName?.trim() || 'this celebration'
      if (options.celebrationId) {
        return `This follows ${name} whenever it occurs, at ${hour}.`
      }
      if (options.celebrationMonth && options.celebrationDay) {
        return `This repeats every year for ${name} on ${formatAnnualDate(
          options.celebrationMonth,
          options.celebrationDay,
        )}, at ${hour}.`
      }
      return `This repeats each year for ${name}, at ${hour}.`
    }
    case 'date':
    default:
      return `This applies only to ${options.date ? formatDateOnly(options.date) : 'one calendar date'}, at ${hour}.`
  }
}

function celebrationRankLabel(entry: Entry): string {
  return entry.celebrationRank ? CELEBRATION_RANK_LABELS[entry.celebrationRank] : 'Celebration'
}

export function formatAnnualDate(month: number, day: number): string {
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, month - 1, 1)),
  )
  return `${day} ${monthName}`
}

export const KEY_TYPE_SHORT = KEY_TYPE_LABELS
