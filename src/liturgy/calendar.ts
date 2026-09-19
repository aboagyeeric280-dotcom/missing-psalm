/**
 * Roman Rite (Ordinary Form) liturgical calendar.
 *
 * Everything is derived from three anchors: Easter, the First Sunday of Advent
 * and the Baptism of the Lord. The psalter week is derived from the week of the
 * season, which is what a printed four-week psalter is arranged around.
 */

import {
  addDays,
  diffDays,
  formatDateOnly,
  makeISO,
  ordinalNumeral,
  ordinalWord,
  sundayOnOrBefore,
  weekdayOf,
  WEEKDAY_NAMES,
  yearOf,
  type ISODate,
} from './dates'
import {
  easterFor,
  fixedCelebrationFor,
  movableCelebrations,
  type Celebration,
  type LiturgicalColour,
} from './celebrations'

export type { Celebration, LiturgicalColour }

export type Season = 'advent' | 'christmas' | 'lent' | 'easter' | 'ordinary'

export const SEASONS: Season[] = ['advent', 'christmas', 'lent', 'easter', 'ordinary']

export const SEASON_NAMES: Record<Season, string> = {
  advent: 'Advent',
  christmas: 'Christmas Time',
  lent: 'Lent',
  easter: 'Easter Time',
  ordinary: 'Ordinary Time',
}

export const SEASON_COLOURS: Record<Season, LiturgicalColour> = {
  advent: 'violet',
  christmas: 'white',
  lent: 'violet',
  easter: 'white',
  ordinary: 'green',
}

export type PsalterWeek = 1 | 2 | 3 | 4

export interface LiturgicalDay {
  date: ISODate
  season: Season
  seasonName: string
  /** Week within the season. 0 is used for the days after Ash Wednesday. */
  weekOfSeason: number
  weekLabel: string
  psalterWeek: PsalterWeek
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number
  weekdayName: string
  colour: LiturgicalColour
  title: string
  celebration?: Celebration
  isSunday: boolean
  isLateAdvent: boolean
  isChristmasOctave: boolean
  /** True when the day normally has proper texts. */
  prefersExactDate: boolean
  notes: string[]
}

/** First Sunday of Advent for the civil year `year`. */
export function adventStartFor(year: number): ISODate {
  const christmasEve = makeISO(year, 12, 24)
  const fourthSunday = addDays(christmasEve, -weekdayOf(christmasEve))
  return addDays(fourthSunday, -21)
}

/** The Baptism of the Lord: the Sunday after 6 January. */
export function baptismFor(year: number): ISODate {
  const epiphany = makeISO(year, 1, 6)
  return addDays(epiphany, 7 - weekdayOf(epiphany))
}

/** The Holy Family: the Sunday within the Christmas octave, or 30 December. */
export function holyFamilyFor(year: number): ISODate {
  const christmas = makeISO(year, 12, 25)
  const weekday = weekdayOf(christmas)
  return weekday === 0 ? makeISO(year, 12, 30) : addDays(christmas, 7 - weekday)
}

/** Christ the King: the Sunday of the 34th week, immediately before Advent. */
export function christTheKingFor(year: number): ISODate {
  return addDays(adventStartFor(year), -7)
}

export function psalterWeekFor(season: Season, weekOfSeason: number): PsalterWeek {
  if (season === 'lent' && weekOfSeason === 0) return 4 // Ash Wednesday week
  const index = ((weekOfSeason - 1) % 4 + 4) % 4
  return (index + 1) as PsalterWeek
}

interface SeasonPlacement {
  season: Season
  weekOfSeason: number
}

function placeInSeason(iso: ISODate): SeasonPlacement {
  const year = yearOf(iso)
  const easter = easterFor(year)
  const ashWednesday = addDays(easter, -46)
  const pentecost = addDays(easter, 49)
  const adventStart = adventStartFor(year)
  const baptism = baptismFor(year)
  const sunday = sundayOnOrBefore(iso)

  if (iso >= makeISO(year, 12, 25)) {
    return { season: 'christmas', weekOfSeason: christmasWeek(iso, year) }
  }
  if (iso >= adventStart) {
    return { season: 'advent', weekOfSeason: 1 + diffDays(adventStart, sunday) / 7 }
  }
  if (iso <= baptism) {
    return { season: 'christmas', weekOfSeason: christmasWeek(iso, year - 1) }
  }
  if (iso >= ashWednesday && iso < easter) {
    const lentFirstSunday = addDays(ashWednesday, 4)
    if (iso < lentFirstSunday) return { season: 'lent', weekOfSeason: 0 }
    return { season: 'lent', weekOfSeason: 1 + diffDays(lentFirstSunday, sunday) / 7 }
  }
  if (iso >= easter && iso <= pentecost) {
    return { season: 'easter', weekOfSeason: 1 + diffDays(easter, sunday) / 7 }
  }
  if (iso < ashWednesday) {
    // First stretch of Ordinary Time: week 1 begins with the Baptism Sunday.
    return { season: 'ordinary', weekOfSeason: 1 + diffDays(baptism, sunday) / 7 }
  }
  // Second stretch: counted back from the 34th week, which ends before Advent.
  const lastOrdinarySunday = addDays(adventStart, -7)
  return {
    season: 'ordinary',
    weekOfSeason: 34 - diffDays(sunday, lastOrdinarySunday) / 7,
  }
}

/** 1 = octave (25 Dec – 1 Jan), 2 = up to Epiphany, 3 = after Epiphany. */
function christmasWeek(iso: ISODate, christmasYear: number): number {
  const octaveEnd = makeISO(christmasYear + 1, 1, 1)
  const epiphany = makeISO(christmasYear + 1, 1, 6)
  if (iso <= octaveEnd) return 1
  if (iso <= epiphany) return 2
  return 3
}

export function weekLabelFor(season: Season, weekOfSeason: number): string {
  switch (season) {
    case 'advent':
      return `${ordinalWord(weekOfSeason)} Week of Advent`
    case 'christmas':
      if (weekOfSeason === 1) return 'Octave of Christmas'
      if (weekOfSeason === 2) return 'Christmas Time before Epiphany'
      return 'Christmas Time after Epiphany'
    case 'lent':
      if (weekOfSeason === 0) return 'Week of Ash Wednesday'
      if (weekOfSeason === 6) return 'Holy Week'
      return `${ordinalWord(weekOfSeason)} Week of Lent`
    case 'easter':
      if (weekOfSeason === 1) return 'Octave of Easter'
      if (weekOfSeason === 8) return 'Pentecost'
      return `${ordinalWord(weekOfSeason)} Week of Easter`
    case 'ordinary':
    default:
      return `${ordinalWord(weekOfSeason)} Week in Ordinary Time`
  }
}

/** Plain-language phrase used in the editor, e.g. "the 8th week of Ordinary Time". */
export function weekKeyPhrase(season: Season, weekOfSeason: number): string {
  if (season === 'lent' && weekOfSeason === 0) return 'the week of Ash Wednesday'
  if (season === 'christmas') return weekLabelFor(season, weekOfSeason).toLowerCase()
  if (season === 'easter' && weekOfSeason === 8) return 'Pentecost'
  const scope = season === 'ordinary' ? 'in Ordinary Time' : `of ${SEASON_NAMES[season]}`
  return `the ${ordinalNumeral(weekOfSeason)} week ${scope}`
}

export function weeksInSeason(season: Season): number[] {
  switch (season) {
    case 'advent':
      return [1, 2, 3, 4]
    case 'christmas':
      return [1, 2, 3]
    case 'lent':
      return [0, 1, 2, 3, 4, 5, 6]
    case 'easter':
      return [1, 2, 3, 4, 5, 6, 7, 8]
    case 'ordinary':
    default:
      return Array.from({ length: 34 }, (_, index) => index + 1)
  }
}

function defaultTitle(season: Season, weekOfSeason: number, weekday: number, iso: ISODate): string {
  const dayName = WEEKDAY_NAMES[weekday]
  const isSunday = weekday === 0
  switch (season) {
    case 'advent': {
      if (isSunday) return `${ordinalWord(weekOfSeason)} Sunday of Advent`
      const day = Number(iso.slice(8, 10))
      const month = Number(iso.slice(5, 7))
      if (month === 12 && day >= 17) return `${formatDateOnly(iso)} — Advent Weekday`
      return `${dayName} of the ${ordinalWord(weekOfSeason)} Week of Advent`
    }
    case 'christmas':
      if (isSunday) return `Sunday of Christmas Time`
      return `${formatDateOnly(iso)} — Christmas Weekday`
    case 'lent':
      if (weekOfSeason === 0) return `${dayName} after Ash Wednesday`
      if (weekOfSeason === 6) return `${dayName} of Holy Week`
      return isSunday
        ? `${ordinalWord(weekOfSeason)} Sunday of Lent`
        : `${dayName} of the ${ordinalWord(weekOfSeason)} Week of Lent`
    case 'easter':
      if (weekOfSeason === 1) return `${dayName} within the Octave of Easter`
      return isSunday
        ? `${ordinalWord(weekOfSeason)} Sunday of Easter`
        : `${dayName} of the ${ordinalWord(weekOfSeason)} Week of Easter`
    case 'ordinary':
    default:
      return isSunday
        ? `${ordinalWord(weekOfSeason)} Sunday in Ordinary Time`
        : `${dayName} of the ${ordinalWord(weekOfSeason)} Week in Ordinary Time`
  }
}

export function resolveLiturgicalDay(iso: ISODate): LiturgicalDay {
  const year = yearOf(iso)
  const easter = easterFor(year)
  const { season, weekOfSeason } = placeInSeason(iso)
  const weekday = weekdayOf(iso)
  const isSunday = weekday === 0
  const notes: string[] = []

  const movable = movableCelebrations({
    easter,
    baptism: baptismFor(year),
    holyFamily: holyFamilyFor(year),
    christTheKing: christTheKingFor(year),
  })

  let celebration = movable[iso]
  const inHolyWeek = iso >= addDays(easter, -7) && iso < easter
  const inEasterOctave = iso >= easter && iso <= addDays(easter, 7)

  if (!celebration) {
    const fixed = fixedCelebrationFor(iso)
    if (fixed) {
      if (inHolyWeek || inEasterOctave) {
        notes.push(`${fixed.name} is transferred this year; Holy Week and the Octave of Easter take precedence.`)
      } else if (isSunday && (season === 'advent' || season === 'lent' || season === 'easter')) {
        notes.push(`${fixed.name} gives way to the Sunday and is transferred or omitted this year.`)
      } else if (isSunday && fixed.rank === 'feast' && !fixed.ofTheLord) {
        notes.push(`${fixed.name} gives way to the Sunday this year.`)
      } else {
        celebration = fixed
      }
    }
  }

  const month = Number(iso.slice(5, 7))
  const dayOfMonth = Number(iso.slice(8, 10))
  const isLateAdvent = season === 'advent' && !isSunday && month === 12 && dayOfMonth >= 17
  const isChristmasOctave =
    season === 'christmas' && ((month === 12 && dayOfMonth >= 25) || (month === 1 && dayOfMonth === 1))

  let colour: LiturgicalColour = celebration?.colour ?? SEASON_COLOURS[season]
  if (!celebration) {
    if (season === 'advent' && isSunday && weekOfSeason === 3) colour = 'rose'
    if (season === 'lent' && isSunday && weekOfSeason === 4) colour = 'rose'
  }

  if (celebration?.note) notes.push(celebration.note)
  if (isLateAdvent) {
    notes.push('17–24 December has proper texts. An exact-date entry is usually the right choice.')
  } else if (isChristmasOctave) {
    notes.push('Days in the Christmas octave have proper texts. An exact-date entry is usually the right choice.')
  } else if (celebration) {
    notes.push(
      `${celebration.rank === 'solemnity' ? 'Solemnities' : 'Feasts'} have proper texts. A celebration entry can follow this observance from year to year; use an exact date for a one-year transfer.`,
    )
  }

  return {
    date: iso,
    season,
    seasonName: SEASON_NAMES[season],
    weekOfSeason,
    weekLabel: weekLabelFor(season, weekOfSeason),
    psalterWeek: psalterWeekFor(season, weekOfSeason),
    weekday,
    weekdayName: WEEKDAY_NAMES[weekday],
    colour,
    title: celebration?.name ?? defaultTitle(season, weekOfSeason, weekday, iso),
    celebration,
    isSunday,
    isLateAdvent,
    isChristmasOctave,
    prefersExactDate: Boolean(celebration) || isLateAdvent || isChristmasOctave,
    notes,
  }
}

export const COLOUR_NAMES: Record<LiturgicalColour, string> = {
  violet: 'Violet',
  white: 'White',
  green: 'Green',
  red: 'Red',
  rose: 'Rose',
}
