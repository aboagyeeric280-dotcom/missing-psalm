import { describe, expect, it } from 'vitest'
import { resolveLiturgicalDay } from '../liturgy/calendar'
import { resolveOffice } from './resolve'
import { EMPTY_CONTENT, type Entry } from './types'

function entry(partial: Partial<Entry> & Pick<Entry, 'keyType' | 'hour'>): Entry {
  return {
    ...EMPTY_CONTENT,
    id: Math.random().toString(36).slice(2),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const MONDAY_OT_WEEK_1 = '2026-01-12'
const MONDAY_OT_WEEK_5 = '2026-02-09'

describe('self-check 1: a psalter entry repeats every four weeks', () => {
  const psalterReading = entry({
    keyType: 'psalter',
    hour: 'morning',
    season: 'ordinary',
    psalterWeek: 1,
    weekday: 1,
    reference: 'Romans 13:11',
    readingText: 'It is now the hour for us to rise from sleep.',
    translation: 'Douay-Rheims',
  })

  it('appears on Monday of the first week of Ordinary Time', () => {
    const office = resolveOffice([psalterReading], resolveLiturgicalDay(MONDAY_OT_WEEK_1), 'morning')
    expect(office.sections.reading.present).toBe(true)
    expect(office.sections.reading.keyType).toBe('psalter')
  })

  it('appears again on Monday of the fifth week of Ordinary Time', () => {
    const day = resolveLiturgicalDay(MONDAY_OT_WEEK_5)
    expect(day.weekOfSeason).toBe(5)
    expect(day.psalterWeek).toBe(1)
    const office = resolveOffice([psalterReading], day, 'morning')
    expect(office.sections.reading.entry?.id).toBe(psalterReading.id)
  })

  it('does not appear on a different weekday or hour', () => {
    const tuesday = resolveOffice([psalterReading], resolveLiturgicalDay('2026-01-13'), 'morning')
    expect(tuesday.sections.reading.present).toBe(false)
    const evening = resolveOffice([psalterReading], resolveLiturgicalDay(MONDAY_OT_WEEK_1), 'evening')
    expect(evening.sections.reading.present).toBe(false)
  })
})

describe('self-check 2: a week entry stays in its own week', () => {
  const weekPrayer = entry({
    keyType: 'week',
    hour: 'morning',
    season: 'ordinary',
    weekOfSeason: 8,
    concludingPrayer: 'Prayer for the eighth week.',
  })

  it('appears in the eighth week of Ordinary Time', () => {
    const eighthWeek = resolveLiturgicalDay(findDateForOrdinaryWeek(8))
    expect(eighthWeek.weekOfSeason).toBe(8)
    const office = resolveOffice([weekPrayer], eighthWeek, 'morning')
    expect(office.sections.concludingPrayer.present).toBe(true)
  })

  it('does not appear in the twelfth week of Ordinary Time', () => {
    const twelfth = resolveLiturgicalDay(findDateForOrdinaryWeek(12))
    expect(twelfth.weekOfSeason).toBe(12)
    expect(twelfth.psalterWeek).toBe(4)
    const office = resolveOffice([weekPrayer], twelfth, 'morning')
    expect(office.sections.concludingPrayer.present).toBe(false)
  })
})

describe('self-check 3: an exact date overrides the psalter for that day only', () => {
  const psalterReading = entry({
    keyType: 'psalter',
    hour: 'morning',
    season: 'advent',
    psalterWeek: 4,
    weekday: 0,
    reference: 'Psalter reference',
    readingText: 'Psalter reading.',
  })
  const dateReading = entry({
    keyType: 'date',
    hour: 'morning',
    date: '2026-12-20',
    reference: 'Exact-date reference',
    readingText: 'Exact-date reading.',
  })
  const entries = [psalterReading, dateReading]

  it('shows the exact-date material on 20 December 2026', () => {
    const day = resolveLiturgicalDay('2026-12-20')
    expect(day.season).toBe('advent')
    expect(day.psalterWeek).toBe(4)
    expect(day.weekday).toBe(0)
    const office = resolveOffice(entries, day, 'morning')
    expect(office.sections.reading.keyType).toBe('date')
    expect(office.sections.reading.entry?.readingText).toBe('Exact-date reading.')
  })

  it('reports what it is overriding', () => {
    const office = resolveOffice(entries, resolveLiturgicalDay('2026-12-20'), 'morning')
    expect(office.sections.reading.overridden).toHaveLength(1)
    expect(office.sections.reading.overridden[0].id).toBe(psalterReading.id)
  })

  it('leaves the psalter entry working on another matching day', () => {
    const otherSunday = resolveLiturgicalDay('2025-12-21') // Advent, psalter IV, Sunday
    expect(otherSunday.season).toBe('advent')
    expect(otherSunday.psalterWeek).toBe(4)
    expect(otherSunday.weekday).toBe(0)
    const office = resolveOffice(entries, otherSunday, 'morning')
    expect(office.sections.reading.keyType).toBe('psalter')
    expect(office.sections.reading.entry?.readingText).toBe('Psalter reading.')
  })
})

describe('self-check 4: the four sections resolve independently', () => {
  const day = resolveLiturgicalDay(MONDAY_OT_WEEK_1)
  const entries = [
    entry({
      keyType: 'psalter',
      hour: 'morning',
      season: 'ordinary',
      psalterWeek: 1,
      weekday: 1,
      reference: 'Rom 13:11',
      readingText: 'Psalter reading.',
      responsory: 'Psalter responsory.',
      intercessions: 'Psalter intercessions.',
      concludingPrayer: 'Psalter prayer.',
    }),
    entry({
      keyType: 'date',
      hour: 'morning',
      date: MONDAY_OT_WEEK_1,
      intercessions: 'Date intercessions.',
    }),
    entry({
      keyType: 'week',
      hour: 'morning',
      season: 'ordinary',
      weekOfSeason: 1,
      concludingPrayer: 'Week prayer.',
    }),
  ]

  const office = resolveOffice(entries, day, 'morning')

  it('takes each section from the most specific record that supplies it', () => {
    expect(office.sections.reading.keyType).toBe('psalter')
    expect(office.sections.responsory.keyType).toBe('psalter')
    expect(office.sections.intercessions.keyType).toBe('date')
    expect(office.sections.concludingPrayer.keyType).toBe('week')
  })

  it('does not let a high-priority record hide sections it does not contain', () => {
    expect(office.sections.reading.entry?.readingText).toBe('Psalter reading.')
    expect(office.sections.responsory.entry?.responsory).toBe('Psalter responsory.')
  })

  it('reports overrides per section', () => {
    expect(office.sections.intercessions.overridden).toHaveLength(1)
    expect(office.sections.reading.overridden).toHaveLength(0)
  })

  it('reports missing sections rather than inventing them', () => {
    const empty = resolveOffice([], day, 'night')
    for (const section of Object.values(empty.sections)) {
      expect(section.present).toBe(false)
      expect(section.entry).toBeUndefined()
    }
  })
})

/** Find a date that lands in the requested Ordinary Time week in 2026. */
function findDateForOrdinaryWeek(week: number): string {
  let date = '2026-01-01'
  for (let index = 0; index < 400; index += 1) {
    const day = resolveLiturgicalDay(date)
    if (day.season === 'ordinary' && day.weekOfSeason === week && day.weekday === 1) return date
    const next = new Date(`${date}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    date = next.toISOString().slice(0, 10)
  }
  throw new Error(`No Ordinary Time week ${week} found`)
}
