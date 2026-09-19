import type { ISODate } from '../liturgy/dates'
import type { PsalterWeek, Season } from '../liturgy/calendar'

export type Hour = 'morning' | 'midday' | 'evening' | 'night'
export type KeyType = 'psalter' | 'week' | 'date'
export type SectionId = 'reading' | 'responsory' | 'intercessions' | 'concludingPrayer'

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

export const KEY_TYPES: KeyType[] = ['psalter', 'week', 'date']

export const KEY_TYPE_LABELS: Record<KeyType, string> = {
  psalter: 'Psalter',
  week: 'Week',
  date: 'Exact date',
}

/** Higher number wins. Exact date beats week, week beats psalter. */
export const KEY_TYPE_PRIORITY: Record<KeyType, number> = {
  psalter: 1,
  week: 2,
  date: 3,
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
export function keyId(entry: Pick<Entry, 'keyType' | 'hour' | 'season' | 'psalterWeek' | 'weekday' | 'weekOfSeason' | 'date'>): string {
  switch (entry.keyType) {
    case 'date':
      return `date|${entry.date ?? '?'}|${entry.hour}`
    case 'week':
      return `week|${entry.season ?? '?'}|${entry.weekOfSeason ?? '?'}|${entry.hour}`
    case 'psalter':
    default:
      return `psalter|${entry.season ?? '?'}|${entry.psalterWeek ?? '?'}|${entry.weekday ?? '?'}|${entry.hour}`
  }
}
