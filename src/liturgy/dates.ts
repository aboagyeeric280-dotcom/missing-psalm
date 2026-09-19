/**
 * Plain-date helpers.
 *
 * All liturgical arithmetic is done on `YYYY-MM-DD` strings backed by UTC
 * `Date` objects, so a user in any timezone gets the same liturgical day for
 * the same calendar date. Local time is used in exactly one place: working out
 * what "today" is.
 */

export type ISODate = string // YYYY-MM-DD

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && toISO(parsed) === value
}

export function toISO(date: Date): ISODate {
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromISO(iso: ISODate): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function makeISO(year: number, month: number, day: number): ISODate {
  return toISO(new Date(Date.UTC(year, month - 1, day)))
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = fromISO(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toISO(date)
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000)
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: ISODate): number {
  return fromISO(iso).getUTCDay()
}

/** The Sunday on or before `iso`. Liturgical weeks run Sunday to Saturday. */
export function sundayOnOrBefore(iso: ISODate): ISODate {
  return addDays(iso, -weekdayOf(iso))
}

export function yearOf(iso: ISODate): number {
  return fromISO(iso).getUTCFullYear()
}

export function todayISO(now: Date = new Date()): ISODate {
  const year = String(now.getFullYear()).padStart(4, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** e.g. "Monday 20 December 2026" */
export function formatLongDate(iso: ISODate): string {
  const date = fromISO(iso)
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTH_NAMES[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`
}

/** e.g. "20 December 2026" */
export function formatDateOnly(iso: ISODate): string {
  const date = fromISO(iso)
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** e.g. "20 Dec 2026" */
export function formatShortDate(iso: ISODate): string {
  const date = fromISO(iso)
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}`
}

const ORDINALS = [
  'zeroth',
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
  'Sixteenth',
  'Seventeenth',
  'Eighteenth',
  'Nineteenth',
  'Twentieth',
  'Twenty-first',
  'Twenty-second',
  'Twenty-third',
  'Twenty-fourth',
  'Twenty-fifth',
  'Twenty-sixth',
  'Twenty-seventh',
  'Twenty-eighth',
  'Twenty-ninth',
  'Thirtieth',
  'Thirty-first',
  'Thirty-second',
  'Thirty-third',
  'Thirty-fourth',
]

export function ordinalWord(n: number): string {
  return ORDINALS[n] ?? `${n}th`
}

export function ordinalNumeral(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export const ROMAN_WEEK = ['', 'I', 'II', 'III', 'IV'] as const
