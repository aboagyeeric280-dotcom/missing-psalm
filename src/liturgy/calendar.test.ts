import { describe, expect, it } from 'vitest'
import {
  adventStartFor,
  baptismFor,
  christTheKingFor,
  holyFamilyFor,
  psalterWeekFor,
  resolveLiturgicalDay,
} from './calendar'
import { easterFor } from './celebrations'
import { addDays, weekdayOf } from './dates'

describe('anchors', () => {
  it('computes Gregorian Easter', () => {
    expect(easterFor(2024)).toBe('2024-03-31')
    expect(easterFor(2025)).toBe('2025-04-20')
    expect(easterFor(2026)).toBe('2026-04-05')
    expect(easterFor(2027)).toBe('2027-03-28')
    expect(easterFor(2030)).toBe('2030-04-21')
  })

  it('computes the First Sunday of Advent', () => {
    expect(adventStartFor(2025)).toBe('2025-11-30')
    expect(adventStartFor(2026)).toBe('2026-11-29')
    expect(adventStartFor(2027)).toBe('2027-11-28')
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      expect(weekdayOf(adventStartFor(year))).toBe(0)
    }
  })

  it('computes the Baptism of the Lord as the Sunday after 6 January', () => {
    expect(baptismFor(2024)).toBe('2024-01-07')
    expect(baptismFor(2025)).toBe('2025-01-12')
    expect(baptismFor(2026)).toBe('2026-01-11')
    expect(baptismFor(2027)).toBe('2027-01-10')
  })

  it('computes the Holy Family and Christ the King', () => {
    expect(holyFamilyFor(2026)).toBe('2026-12-27')
    expect(holyFamilyFor(2022)).toBe('2022-12-30') // Christmas fell on a Sunday
    expect(christTheKingFor(2026)).toBe('2026-11-22')
  })
})

describe('season resolution', () => {
  const cases: Array<[string, string, number, number]> = [
    // date, season, week of season, psalter week
    ['2026-01-12', 'ordinary', 1, 1],
    ['2026-02-09', 'ordinary', 5, 1],
    ['2026-02-18', 'lent', 0, 4], // Ash Wednesday
    ['2026-02-22', 'lent', 1, 1],
    ['2026-03-29', 'lent', 6, 2], // Holy Week
    ['2026-04-05', 'easter', 1, 1],
    ['2026-05-24', 'easter', 8, 4], // Pentecost
    ['2026-11-29', 'advent', 1, 1],
    ['2026-12-20', 'advent', 4, 4],
    ['2026-12-25', 'christmas', 1, 1],
  ]

  it.each(cases)('%s resolves correctly', (date, season, week, psalter) => {
    const day = resolveLiturgicalDay(date)
    expect(day.season).toBe(season)
    expect(day.weekOfSeason).toBe(week)
    expect(day.psalterWeek).toBe(psalter)
  })

  it('repeats the psalter every four weeks in Ordinary Time', () => {
    expect(psalterWeekFor('ordinary', 1)).toBe(1)
    expect(psalterWeekFor('ordinary', 5)).toBe(1)
    expect(psalterWeekFor('ordinary', 9)).toBe(1)
    expect(psalterWeekFor('ordinary', 8)).toBe(4)
    expect(psalterWeekFor('ordinary', 12)).toBe(4)
  })

  it('never produces a psalter week outside I-IV across five years', () => {
    let date = '2024-01-01'
    while (date < '2029-01-01') {
      const day = resolveLiturgicalDay(date)
      expect([1, 2, 3, 4]).toContain(day.psalterWeek)
      expect(day.weekOfSeason).toBeGreaterThanOrEqual(0)
      expect(day.weekday).toBe(weekdayOf(date))
      date = addDays(date, 1)
    }
  })

  it('numbers Ordinary Time so that the last week before Advent is the 34th', () => {
    const day = resolveLiturgicalDay('2026-11-28') // Saturday before Advent
    expect(day.season).toBe('ordinary')
    expect(day.weekOfSeason).toBe(34)
  })
})

describe('celebrations and colours', () => {
  it('names solemnities and feasts', () => {
    expect(resolveLiturgicalDay('2026-08-15').title).toContain('Assumption')
    expect(resolveLiturgicalDay('2026-03-19').title).toContain('Saint Joseph')
    expect(resolveLiturgicalDay('2026-12-25').title).toContain('Nativity of the Lord')
    expect(resolveLiturgicalDay('2026-05-24').title).toContain('Pentecost')
  })

  it('uses seasonal colours, including rose Sundays', () => {
    expect(resolveLiturgicalDay('2026-02-09').colour).toBe('green')
    expect(resolveLiturgicalDay('2026-12-13').colour).toBe('rose') // Gaudete
    expect(resolveLiturgicalDay('2026-03-15').colour).toBe('rose') // Laetare
    expect(resolveLiturgicalDay('2026-05-24').colour).toBe('red') // Pentecost
  })

  it('flags days that normally have proper texts', () => {
    expect(resolveLiturgicalDay('2026-12-21').prefersExactDate).toBe(true) // late Advent
    expect(resolveLiturgicalDay('2026-12-29').prefersExactDate).toBe(true) // octave
    expect(resolveLiturgicalDay('2026-02-09').prefersExactDate).toBe(false)
  })

  it('does not label an Advent Sunday as a weekday', () => {
    const day = resolveLiturgicalDay('2026-12-20')
    expect(day.isSunday).toBe(true)
    expect(day.title).toBe('Fourth Sunday of Advent')
    expect(day.isLateAdvent).toBe(false)
  })
})
