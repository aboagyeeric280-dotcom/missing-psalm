import type { ISODate } from '../liturgy/dates'
import type { PsalterWeek, Season } from '../liturgy/calendar'

export type Hour = 'morning' | 'midday' | 'evening' | 'night'
export type KeyType = 'psalter' | 'week' | 'celebration' | 'date'
export type SectionId = 'reading' | 'responsory' | 'intercessions' | 'concludingPrayer'
export type CelebrationRank = 'optionalMemorial' | 'memorial' | 'feast' | 'solemnity'
export type CalendarScope = 'general' | 'national' | 'diocesan' | 'local'

export const HOURS: Hour[] = ['morning', 'midday', 'evening', 'night']

export interface HourMeta {
  id: Hour
  label: string
  traditional: string
  description: string
}

export const HOUR_META: Record<Hour, HourMeta> = {
  morning: { id: 'morning', label: 'Morning', traditional: 'Lauds', description: 'Morning Prayer' },
  midday: { id: 'midday', label: 'Midday', traditional: 'Daytime', description: 'Daytime Prayer (Terce, Sext, None)' },
  evening: { id: 'evening', label: 'Evening', traditional: 'Vespers', description: 'Evening Prayer' },
  night: { id: 'night', label: 'Night', traditional: 'Compline', description: 'Night Prayer' },
}

export const KEY_TYPES: KeyType[] = ['psalter', 'week', 'celebration', 'date']

export const KEY_TYPE_LABELS: Record<KeyType, string> = {
  psalter: 'Psalter',
  week: 'Week',
  celebration: 'Celebration',
  date: 'Exact date',
}

/** Higher number wins. Exact date beats celebration, week and psalter. */
export const KEY_TYPE_PRIORITY: Record<KeyType, number> = {
  psalter: 1,
  week: 2,
  celebration: 3,
  date: 4,
}

export const CELEBRATION_RANKS: CelebrationRank[] = [
  'optionalMemorial',
  'memorial',
  'feast',
  'solemnity',
]

export const CELEBRATION_RANK_LABELS: Record<CelebrationRank, string> = {
  optionalMemorial: 'Optional Memorial',
  memorial: 'Memorial',
  feast: 'Feast',
  solemnity: 'Solemnity',
}

export const CALENDAR_SCOPES: CalendarScope[] = ['general', 'national', 'diocesan', 'local']

export const CALENDAR_SCOPE_LABELS: Record<CalendarScope, string> = {
  general: 'General Roman Calendar',
  national: 'National calendar',
  diocesan: 'Diocesan calendar',
  local: 'Local or community calendar',
}

/** Validates an annual month/day pair, allowing 29 February. */
export function isValidAnnualDate(month: number | undefined, day: number | undefined): boolean {
  if (!month || !day) return false
  const date = new Date(Date.UTC(2024, month - 1, day))
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export const SECTIONS: SectionId[] = ['reading', 'responsory', 'intercessions', 'concludingPrayer']

export interface SectionMeta {
  id: SectionId
  label: string
  shortLabel: string
  defaultKeyType: KeyType
  /** Content fields an entry uses for this section. */
  fields: (keyof EntryContent)[]
  placeholder: string
}

export const SECTION_META: Record<SectionId, SectionMeta> = {
  reading: {
    id: 'reading',
    label: 'Short reading',
    shortLabel: 'Reading',
    defaultKeyType: 'psalter',
    fields: ['reference', 'readingText', 'translation'],
    placeholder: 'Type or paste the short reading exactly as it is printed.',
  },
  responsory: {
    id: 'responsory',
    label: 'Responsory',
    shortLabel: 'Responsory',
    defaultKeyType: 'psalter',
    fields: ['responsory'],
    placeholder: 'Type the responsory, keeping the versicle and response on separate lines.',
  },
  intercessions: {
    id: 'intercessions',
    label: 'Intercessions',
    shortLabel: 'Intercessions',
    defaultKeyType: 'psalter',
    fields: ['intercessions'],
    placeholder: 'Type the intercessions, one petition per line.',
  },
  concludingPrayer: {
    id: 'concludingPrayer',
    label: 'Concluding prayer',
    shortLabel: 'Prayer',
    defaultKeyType: 'week',
    fields: ['concludingPrayer'],
    placeholder: 'Type the concluding prayer.',
  },
}

export interface EntryContent {
  reference: string
  readingText: string
  translation: string
  responsory: string
  intercessions: string
  concludingPrayer: string
}

export const EMPTY_CONTENT: EntryContent = {
  reference: '',
  readingText: '',
  translation: '',
  responsory: '',
  intercessions: '',
  concludingPrayer: '',
}

export interface Entry extends EntryContent {
  id: string
  keyType: KeyType
  hour: Hour
  /** psalter and week keys */
  season?: Season
  /** psalter key */
  psalterWeek?: PsalterWeek
  /** psalter key: 0 = Sunday ... 6 = Saturday */
  weekday?: number
  /** week key */
  weekOfSeason?: number
  /** celebration key: stable identifier for built-in movable or fixed celebrations */
  celebrationId?: string
  /** celebration key: wording shown to the user */
  celebrationName?: string
  /** celebration key */
  celebrationRank?: CelebrationRank
  /** celebration key */
  calendarScope?: CalendarScope
  /** celebration key: fixed annual date, used for user-added memorials and local observances */
  celebrationMonth?: number
  celebrationDay?: number
  /** date key */
  date?: ISODate
  /** Free-text note from the user; never displayed as part of the office. */
  note?: string
  /** Marks example material supplied with the app. */
  source?: string
  /** Set by migration when a legacy record could not be keyed confidently. */
  needsReview?: boolean
  createdAt: string
  updatedAt: string
}

export interface StoreFile {
  schemaVersion: number
  entries: Entry[]
  meta: StoreMeta
}

export interface StoreMeta {
  createdAt: string
  lastExportAt?: string
  lastMigratedAt?: string
  seedVersion?: number
}

export function sectionHasContent(entry: Pick<Entry, keyof EntryContent>, section: SectionId): boolean {
  if (section === 'reading') return entry.readingText.trim().length > 0
  const field = SECTION_META[section].fields[0]
  return String(entry[field] ?? '').trim().length > 0
}

export function entryIsEmpty(entry: Entry): boolean {
  return SECTIONS.every((section) => !sectionHasContent(entry, section))
}

export function sectionsPresent(entry: Entry): SectionId[] {
  return SECTIONS.filter((section) => sectionHasContent(entry, section))
}

/** Stable identity of an entry's key. Two entries sharing it are duplicates. */
export function keyId(
  entry: Pick<
    Entry,
    | 'keyType'
    | 'hour'
    | 'season'
    | 'psalterWeek'
    | 'weekday'
    | 'weekOfSeason'
    | 'celebrationId'
    | 'celebrationName'
    | 'calendarScope'
    | 'celebrationMonth'
    | 'celebrationDay'
    | 'date'
  >,
): string {
  switch (entry.keyType) {
    case 'date':
      return `date|${entry.date ?? '?'}|${entry.hour}`
    case 'celebration': {
      const identity = entry.celebrationId
        ? `id:${entry.celebrationId}`
        : `fixed:${entry.calendarScope ?? '?'}|${entry.celebrationMonth ?? '?'}-${entry.celebrationDay ?? '?'}|${(
            entry.celebrationName ?? '?'
          ).toLowerCase()}`
      return `celebration|${identity}|${entry.hour}`
    }
    case 'week':
      return `week|${entry.season ?? '?'}|${entry.weekOfSeason ?? '?'}|${entry.hour}`
    case 'psalter':
    default:
      return `psalter|${entry.season ?? '?'}|${entry.psalterWeek ?? '?'}|${entry.weekday ?? '?'}|${entry.hour}`
  }
}
