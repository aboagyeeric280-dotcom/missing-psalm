/**
 * Normalisation and schema migration.
 *
 * Rules that must never be broken:
 *  - nothing the user typed is ever thrown away;
 *  - migrations are idempotent — running them twice changes nothing;
 *  - unrecognised fields are preserved so a newer backup survives a round trip.
 */

import { isISODate, type ISODate } from '../liturgy/dates'
import { SEASONS, type PsalterWeek, type Season } from '../liturgy/calendar'
import {
  EMPTY_CONTENT,
  HOURS,
  KEY_TYPES,
  SECTIONS,
  isValidAnnualDate,
  sectionHasContent,
  type Entry,
  type CalendarScope,
  type CelebrationRank,
  type Hour,
  type KeyType,
  type StoreFile,
  type StoreMeta,
} from './types'

export const CURRENT_SCHEMA_VERSION = 3

const KNOWN_ENTRY_FIELDS = new Set([
  'id',
  'keyType',
  'hour',
  'season',
  'psalterWeek',
  'weekday',
  'weekOfSeason',
  'celebrationId',
  'celebrationName',
  'celebrationRank',
  'calendarScope',
  'celebrationMonth',
  'celebrationDay',
  'date',
  'note',
  'source',
  'needsReview',
  'createdAt',
  'updatedAt',
  'reference',
  'readingText',
  'translation',
  'responsory',
  'intercessions',
  'concludingPrayer',
  'extra',
])

const HOUR_SYNONYMS: Record<string, Hour> = {
  morning: 'morning',
  lauds: 'morning',
  morningprayer: 'morning',
  midday: 'midday',
  daytime: 'midday',
  midmorning: 'midday',
  terce: 'midday',
  sext: 'midday',
  none: 'midday',
  noon: 'midday',
  evening: 'evening',
  vespers: 'evening',
  eveningprayer: 'evening',
  night: 'night',
  compline: 'night',
  nightprayer: 'night',
}

const SEASON_SYNONYMS: Record<string, Season> = {
  advent: 'advent',
  christmas: 'christmas',
  christmastime: 'christmas',
  christmastide: 'christmas',
  lent: 'lent',
  lenten: 'lent',
  easter: 'easter',
  eastertime: 'easter',
  eastertide: 'easter',
  ordinary: 'ordinary',
  ordinarytime: 'ordinary',
  ot: 'ordinary',
}

const WEEKDAY_SYNONYMS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

const ROMAN_TO_NUMBER: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4 }

const CELEBRATION_RANK_SYNONYMS: Record<string, CelebrationRank> = {
  optionalmemorial: 'optionalMemorial',
  optional: 'optionalMemorial',
  memorial: 'memorial',
  obligatorymemorial: 'memorial',
  feast: 'feast',
  solemnity: 'solemnity',
  solemnfeast: 'solemnity',
}

const CALENDAR_SCOPE_SYNONYMS: Record<string, CalendarScope> = {
  general: 'general',
  generalroman: 'general',
  generalromancalendar: 'general',
  national: 'national',
  diocesan: 'diocesan',
  diocese: 'diocesan',
  local: 'local',
  community: 'local',
  religious: 'local',
}

function slug(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function parseHour(value: unknown): Hour | undefined {
  return HOUR_SYNONYMS[slug(value)]
}

export function parseSeason(value: unknown): Season | undefined {
  return SEASON_SYNONYMS[slug(value)]
}

export function parseWeekday(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) return value
  const asSlug = slug(value)
  if (asSlug in WEEKDAY_SYNONYMS) return WEEKDAY_SYNONYMS[asSlug]
  if (/^[0-6]$/.test(asSlug)) return Number(asSlug)
  return undefined
}

export function parsePsalterWeek(value: unknown): PsalterWeek | undefined {
  if (typeof value === 'number' && value >= 1 && value <= 4) return value as PsalterWeek
  const asSlug = slug(value)
  if (asSlug in ROMAN_TO_NUMBER) return ROMAN_TO_NUMBER[asSlug] as PsalterWeek
  if (/^[1-4]$/.test(asSlug)) return Number(asSlug) as PsalterWeek
  return undefined
}

function parseWeekOfSeason(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const asNumber = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(asNumber) || !Number.isInteger(asNumber)) return undefined
  if (asNumber < 0 || asNumber > 34) return undefined
  return asNumber
}

function parseCalendarNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined
}

function parseDate(value: unknown): ISODate | undefined {
  if (typeof value !== 'string') return undefined
  const candidate = value.trim().replace(/\//g, '-')
  return isISODate(candidate) ? candidate : undefined
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map((item) => text(item)).join('\n')
  return String(value).trim()
}

let idCounter = 0

export function newId(prefix = 'e'): string {
  idCounter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}${random}`
}

export interface NormalisedEntry {
  entry: Entry | null
  problems: string[]
}

/**
 * Turn an unknown record into an Entry. Returns problems rather than throwing so
 * callers can show the user what was wrong before anything is written.
 */
export function normaliseEntry(raw: unknown, label = 'entry'): NormalisedEntry {
  const problems: string[] = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { entry: null, problems: [`${label}: not an object`] }
  }
  const record = raw as Record<string, unknown>

  const hour = parseHour(record.hour) ?? parseHour(record.office) ?? parseHour(record.prayer)
  if (!hour) problems.push(`${label}: missing or unrecognised hour`)

  const season = parseSeason(record.season)
  const psalterWeek = parsePsalterWeek(record.psalterWeek ?? record.psalter ?? record.week)
  const weekday = parseWeekday(record.weekday ?? record.day)
  const weekOfSeason = parseWeekOfSeason(record.weekOfSeason ?? record.seasonWeek)
  const celebrationId = text(record.celebrationId) || undefined
  const celebrationName = text(record.celebrationName ?? record.celebration) || undefined
  const celebrationRank = CELEBRATION_RANK_SYNONYMS[slug(record.celebrationRank ?? record.rank)]
  const calendarScope = CALENDAR_SCOPE_SYNONYMS[slug(record.calendarScope ?? record.calendar)]
  const celebrationMonth = parseCalendarNumber(record.celebrationMonth ?? record.month, 1, 12)
  const celebrationDay = parseCalendarNumber(record.celebrationDay ?? record.dayOfMonth, 1, 31)
  const date = parseDate(record.date)

  const declared = KEY_TYPES.includes(record.keyType as KeyType) ? (record.keyType as KeyType) : undefined
  let keyType: KeyType
  let needsReview = record.needsReview === true

  if (declared) {
    keyType = declared
  } else if (date) {
    keyType = 'date'
  } else if (celebrationId || (celebrationName && celebrationMonth && celebrationDay)) {
    keyType = 'celebration'
  } else if (season && psalterWeek && weekday !== undefined) {
    keyType = 'psalter'
  } else if (season && weekOfSeason !== undefined) {
    keyType = 'week'
  } else {
    keyType = 'psalter'
    needsReview = true
  }

  const content = {
    reference: text(record.reference ?? record.scripture ?? record.citation),
    readingText: text(record.readingText ?? record.reading ?? record.text),
    translation: text(record.translation ?? record.version),
    responsory: text(record.responsory ?? record.response),
    intercessions: text(record.intercessions ?? record.petitions),
    concludingPrayer: text(record.concludingPrayer ?? record.prayer ?? record.collect),
  }

  // A key the resolver cannot match is kept, but flagged for the user to fix.
  if (keyType === 'date' && !date) needsReview = true
  if (
    keyType === 'celebration' &&
    (!celebrationName || (!celebrationId && !isValidAnnualDate(celebrationMonth, celebrationDay)))
  ) {
    needsReview = true
  }
  if (keyType === 'week' && (!season || weekOfSeason === undefined)) needsReview = true
  if (keyType === 'psalter' && (!season || !psalterWeek || weekday === undefined)) needsReview = true

  const extra: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (!KNOWN_ENTRY_FIELDS.has(key)) extra[key] = value
  }
  if (record.extra && typeof record.extra === 'object') {
    Object.assign(extra, record.extra as Record<string, unknown>)
  }

  const now = new Date().toISOString()
  const entry: Entry = {
    ...EMPTY_CONTENT,
    ...content,
    id: typeof record.id === 'string' && record.id.trim() ? record.id.trim() : newId(),
    keyType,
    hour: hour ?? 'morning',
    ...(season ? { season } : {}),
    ...(psalterWeek ? { psalterWeek } : {}),
    ...(weekday !== undefined ? { weekday } : {}),
    ...(weekOfSeason !== undefined ? { weekOfSeason } : {}),
    ...(celebrationId ? { celebrationId } : {}),
    ...(celebrationName ? { celebrationName } : {}),
    ...(celebrationRank ? { celebrationRank } : {}),
    ...(calendarScope ? { calendarScope } : {}),
    ...(celebrationMonth ? { celebrationMonth } : {}),
    ...(celebrationDay ? { celebrationDay } : {}),
    ...(date ? { date } : {}),
    ...(typeof record.note === 'string' && record.note.trim() ? { note: record.note.trim() } : {}),
    ...(typeof record.source === 'string' && record.source.trim() ? { source: record.source.trim() } : {}),
    ...(needsReview ? { needsReview: true } : {}),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
  }
  if (Object.keys(extra).length > 0) {
    ;(entry as Entry & { extra?: Record<string, unknown> }).extra = extra
  }

  const hasAnyContent = SECTIONS.some((section) => sectionHasContent(entry, section))
  if (!hasAnyContent) problems.push(`${label}: no reading, responsory, intercessions or prayer`)

  return { entry, problems }
}

export interface MigrationReport {
  fromVersion: number
  toVersion: number
  entriesIn: number
  entriesOut: number
  prayersSplitToWeek: number
  flaggedForReview: number
  changed: boolean
  problems: string[]
}

function emptyMeta(): StoreMeta {
  return { createdAt: new Date().toISOString() }
}

/**
 * Bring any previously stored shape up to the current schema.
 *
 * Accepted inputs: the current object form, `{ entries: [...] }` without a
 * version, and a bare array of entries (the original shape of this app).
 */
export function migrateStore(raw: unknown): { file: StoreFile; report: MigrationReport } {
  const problems: string[] = []
  let fromVersion = 0
  let rawEntries: unknown[] = []
  let meta: StoreMeta = emptyMeta()

  if (Array.isArray(raw)) {
    rawEntries = raw
  } else if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.schemaVersion === 'number') fromVersion = record.schemaVersion
    if (Array.isArray(record.entries)) {
      rawEntries = record.entries
    } else {
      problems.push('No entries array found; starting from an empty list.')
    }
    if (record.meta && typeof record.meta === 'object') {
      meta = { ...emptyMeta(), ...(record.meta as StoreMeta) }
    }
  } else if (raw !== null && raw !== undefined) {
    problems.push('Stored data was not in a recognised format.')
  }

  const entries: Entry[] = []
  let prayersSplitToWeek = 0
  let flaggedForReview = 0

  rawEntries.forEach((rawEntry, index) => {
    const { entry, problems: entryProblems } = normaliseEntry(rawEntry, `entry ${index + 1}`)
    problems.push(...entryProblems)
    if (!entry) return

    const wasLegacy = !(rawEntry as Record<string, unknown> | null)?.hasOwnProperty?.('keyType')

    if (
      wasLegacy &&
      entry.keyType === 'psalter' &&
      sectionHasContent(entry, 'concludingPrayer') &&
      entry.season &&
      entry.weekOfSeason !== undefined
    ) {
      // Legacy records carried all four sections. Concluding prayers belong to the
      // week of the season, so they are lifted into their own week-keyed record.
      const now = new Date().toISOString()
      entries.push({
        ...EMPTY_CONTENT,
        id: newId('w'),
        keyType: 'week',
        hour: entry.hour,
        season: entry.season,
        weekOfSeason: entry.weekOfSeason,
        concludingPrayer: entry.concludingPrayer,
        note: entry.note,
        createdAt: entry.createdAt,
        updatedAt: now,
      })
      entry.concludingPrayer = ''
      prayersSplitToWeek += 1
    }

    if (entry.needsReview) flaggedForReview += 1
    entries.push(entry)
  })

  // Drop records that ended up with nothing at all in them (they display nothing
  // and match nothing), but only when they were empty to begin with.
  const kept = entries.filter((entry) => SECTIONS.some((section) => sectionHasContent(entry, section)))

  const file: StoreFile = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: kept,
    meta: {
      ...meta,
      ...(fromVersion < CURRENT_SCHEMA_VERSION && rawEntries.length > 0
        ? { lastMigratedAt: new Date().toISOString() }
        : {}),
    },
  }

  return {
    file,
    report: {
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      entriesIn: rawEntries.length,
      entriesOut: kept.length,
      prayersSplitToWeek,
      flaggedForReview,
      changed: fromVersion !== CURRENT_SCHEMA_VERSION || prayersSplitToWeek > 0,
      problems,
    },
  }
}

export const KNOWN_SEASONS = SEASONS
export const KNOWN_HOURS = HOURS
