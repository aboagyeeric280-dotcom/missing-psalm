import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, migrateStore, normaliseEntry } from './migrate'
import { loadStore, saveStore, STORAGE_KEY } from './storage'
import { resolveOffice } from './resolve'
import { resolveLiturgicalDay } from '../liturgy/calendar'
import { sectionsPresent } from './types'

/** The shape the first version of the app wrote: a bare array, no keyType. */
const LEGACY_DATA = [
  {
    id: 'legacy-1',
    season: 'ordinary',
    psalterWeek: 1,
    weekday: 1,
    weekOfSeason: 1,
    hour: 'morning',
    reference: '1 Thessalonians 5:16-18',
    readingText: 'Always rejoice. Pray without ceasing. In all things give thanks.',
    translation: 'Douay-Rheims',
    responsory: 'V. Blessed be the Lord.\nR. Blessed be the Lord.',
    intercessions: 'For the Church.\nFor the world.',
    concludingPrayer: 'Almighty God, hear us.',
  },
  {
    id: 'legacy-2',
    season: 'Advent',
    psalterWeek: 'II',
    weekday: 'Wednesday',
    hour: 'Vespers',
    reference: 'Philippians 4:4-5',
    readingText: 'Rejoice in the Lord always.',
  },
]

describe('self-check 5: existing local data survives an upgrade', () => {
  it('keeps every legacy entry and its exact wording', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_DATA))
    const loaded = loadStore()

    expect(loaded.file.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    const reading = loaded.file.entries.find((entry) => entry.id === 'legacy-1')
    expect(reading?.readingText).toBe('Always rejoice. Pray without ceasing. In all things give thanks.')
    expect(reading?.keyType).toBe('psalter')
    expect(reading?.translation).toBe('Douay-Rheims')
  })

  it('understands legacy spellings of hour, season, psalter week and weekday', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_DATA))
    const second = loadStore().file.entries.find((entry) => entry.id === 'legacy-2')
    expect(second?.hour).toBe('evening')
    expect(second?.season).toBe('advent')
    expect(second?.psalterWeek).toBe(2)
    expect(second?.weekday).toBe(3)
  })

  it('moves a legacy concluding prayer to a week record without losing the rest', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_DATA))
    const { file } = loadStore()

    const psalter = file.entries.find((entry) => entry.id === 'legacy-1')!
    expect(sectionsPresent(psalter)).toEqual(['reading', 'responsory', 'intercessions'])

    const week = file.entries.find((entry) => entry.keyType === 'week')
    expect(week?.concludingPrayer).toBe('Almighty God, hear us.')
    expect(week?.season).toBe('ordinary')
    expect(week?.weekOfSeason).toBe(1)
    expect(week?.hour).toBe('morning')
  })

  it('still displays all four sections after migrating', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_DATA))
    const { file } = loadStore()
    const office = resolveOffice(file.entries, resolveLiturgicalDay('2026-01-12'), 'morning')
    expect(office.sections.reading.present).toBe(true)
    expect(office.sections.responsory.present).toBe(true)
    expect(office.sections.intercessions.present).toBe(true)
    expect(office.sections.concludingPrayer.present).toBe(true)
    expect(office.sections.concludingPrayer.keyType).toBe('week')
  })

  it('is idempotent: migrating again changes nothing', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_DATA))
    const first = loadStore().file
    saveStore(first)
    const second = loadStore().file

    expect(second.entries).toHaveLength(first.entries.length)
    expect(second.entries.map((entry) => entry.concludingPrayer)).toEqual(
      first.entries.map((entry) => entry.concludingPrayer),
    )
    saveStore(second)
    const third = loadStore().file
    expect(third.entries).toHaveLength(first.entries.length)
  })

  it('uses the original storage key', () => {
    expect(STORAGE_KEY).toBe('the-missing-parts-entries-v1')
  })
})

describe('reading damaged or unusual data', () => {
  it('keeps a copy of unreadable data instead of deleting it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json at all')
    const loaded = loadStore()
    expect(loaded.corruptBackupKey).toBeTruthy()
    expect(window.localStorage.getItem(loaded.corruptBackupKey!)).toBe('{not json at all')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{not json at all')
    expect(loaded.file.entries).toEqual([])
  })

  it('accepts the object form as well as a bare array', () => {
    const { file } = migrateStore({ schemaVersion: 2, entries: LEGACY_DATA, meta: { createdAt: 'x' } })
    expect(file.entries.length).toBeGreaterThan(0)
  })

  it('flags an entry it cannot key confidently rather than dropping it', () => {
    const { entry } = normaliseEntry({ hour: 'morning', responsory: 'Something' })
    expect(entry?.needsReview).toBe(true)
    expect(entry?.responsory).toBe('Something')
  })

  it('preserves fields it does not recognise', () => {
    const { entry } = normaliseEntry({
      keyType: 'date',
      date: '2026-12-20',
      hour: 'morning',
      readingText: 'x',
      somethingNew: 'keep me',
    })
    expect((entry as unknown as { extra: Record<string, unknown> }).extra.somethingNew).toBe('keep me')
  })
})
