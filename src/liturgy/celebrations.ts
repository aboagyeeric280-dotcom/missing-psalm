/**
 * Solemnities and feasts of the General Roman Calendar (Ordinary Form).
 *
 * Scope note: this table deliberately covers **solemnities and feasts only**.
 * Obligatory and optional memorials are not listed — the app tells the user to
 * add an exact-date entry for those. Nothing here is a liturgical text; these
 * are calendar facts (names, ranks and colours) used to label the day.
 */

import { addDays, makeISO, type ISODate } from './dates'

export type LiturgicalColour = 'violet' | 'white' | 'green' | 'red' | 'rose'

export type CelebrationRank = 'solemnity' | 'feast'

export interface Celebration {
  name: string
  rank: CelebrationRank
  colour: LiturgicalColour
  /** Feasts of the Lord outrank Sundays in Ordinary Time and Christmas Time. */
  ofTheLord?: boolean
  note?: string
}

/** Stable data key for a named celebration across calendar years. */
export function celebrationIdFor(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type FixedTable = Record<string, Celebration>

/** Keyed by MM-DD. */
export const FIXED_CELEBRATIONS: FixedTable = {
  '01-01': { name: 'Mary, the Holy Mother of God', rank: 'solemnity', colour: 'white' },
  '01-06': { name: 'The Epiphany of the Lord', rank: 'solemnity', colour: 'white', ofTheLord: true, note: 'Celebrated on the Sunday between 2 and 8 January in some countries.' },
  '01-25': { name: 'The Conversion of Saint Paul the Apostle', rank: 'feast', colour: 'white' },
  '02-02': { name: 'The Presentation of the Lord', rank: 'feast', colour: 'white', ofTheLord: true },
  '02-22': { name: 'The Chair of Saint Peter the Apostle', rank: 'feast', colour: 'white' },
  '03-19': { name: 'Saint Joseph, Spouse of the Blessed Virgin Mary', rank: 'solemnity', colour: 'white' },
  '03-25': { name: 'The Annunciation of the Lord', rank: 'solemnity', colour: 'white', ofTheLord: true },
  '04-25': { name: 'Saint Mark, Evangelist', rank: 'feast', colour: 'red' },
  '05-03': { name: 'Saints Philip and James, Apostles', rank: 'feast', colour: 'red' },
  '05-14': { name: 'Saint Matthias, Apostle', rank: 'feast', colour: 'red' },
  '05-31': { name: 'The Visitation of the Blessed Virgin Mary', rank: 'feast', colour: 'white' },
  '06-24': { name: 'The Nativity of Saint John the Baptist', rank: 'solemnity', colour: 'white' },
  '06-29': { name: 'Saints Peter and Paul, Apostles', rank: 'solemnity', colour: 'red' },
  '07-03': { name: 'Saint Thomas, Apostle', rank: 'feast', colour: 'red' },
  '07-22': { name: 'Saint Mary Magdalene', rank: 'feast', colour: 'white' },
  '07-25': { name: 'Saint James, Apostle', rank: 'feast', colour: 'red' },
  '08-06': { name: 'The Transfiguration of the Lord', rank: 'feast', colour: 'white', ofTheLord: true },
  '08-10': { name: 'Saint Lawrence, Deacon and Martyr', rank: 'feast', colour: 'red' },
  '08-15': { name: 'The Assumption of the Blessed Virgin Mary', rank: 'solemnity', colour: 'white' },
  '08-24': { name: 'Saint Bartholomew, Apostle', rank: 'feast', colour: 'red' },
  '09-08': { name: 'The Nativity of the Blessed Virgin Mary', rank: 'feast', colour: 'white' },
  '09-14': { name: 'The Exaltation of the Holy Cross', rank: 'feast', colour: 'red', ofTheLord: true },
  '09-21': { name: 'Saint Matthew, Apostle and Evangelist', rank: 'feast', colour: 'red' },
  '09-29': { name: 'Saints Michael, Gabriel and Raphael, Archangels', rank: 'feast', colour: 'white' },
  '10-18': { name: 'Saint Luke, Evangelist', rank: 'feast', colour: 'red' },
  '10-28': { name: 'Saints Simon and Jude, Apostles', rank: 'feast', colour: 'red' },
  '11-01': { name: 'All Saints', rank: 'solemnity', colour: 'white' },
  '11-02': { name: 'The Commemoration of All the Faithful Departed', rank: 'solemnity', colour: 'violet', note: 'Ranked with solemnities; violet or black vestments are used.' },
  '11-09': { name: 'The Dedication of the Lateran Basilica', rank: 'feast', colour: 'white', ofTheLord: true },
  '11-30': { name: 'Saint Andrew, Apostle', rank: 'feast', colour: 'red' },
  '12-08': { name: 'The Immaculate Conception of the Blessed Virgin Mary', rank: 'solemnity', colour: 'white' },
  '12-25': { name: 'The Nativity of the Lord', rank: 'solemnity', colour: 'white', ofTheLord: true },
  '12-26': { name: 'Saint Stephen, the First Martyr', rank: 'feast', colour: 'red' },
  '12-27': { name: 'Saint John, Apostle and Evangelist', rank: 'feast', colour: 'white' },
  '12-28': { name: 'The Holy Innocents, Martyrs', rank: 'feast', colour: 'red' },
}

export function fixedCelebrationFor(iso: ISODate): Celebration | undefined {
  return FIXED_CELEBRATIONS[iso.slice(5)]
}

export interface MovableAnchors {
  easter: ISODate
  baptism: ISODate
  holyFamily: ISODate
  christTheKing: ISODate
}

/** Movable celebrations, keyed by ISO date, for the liturgical dates in play. */
export function movableCelebrations(anchors: MovableAnchors): Record<ISODate, Celebration> {
  const { easter, baptism, holyFamily, christTheKing } = anchors
  const table: Record<ISODate, Celebration> = {}

  table[addDays(easter, -46)] = { name: 'Ash Wednesday', rank: 'feast', colour: 'violet', ofTheLord: true }
  table[addDays(easter, -7)] = { name: 'Palm Sunday of the Passion of the Lord', rank: 'solemnity', colour: 'red', ofTheLord: true }
  table[addDays(easter, -3)] = { name: 'Thursday of the Lord’s Supper', rank: 'solemnity', colour: 'white', ofTheLord: true }
  table[addDays(easter, -2)] = { name: 'Friday of the Passion of the Lord (Good Friday)', rank: 'solemnity', colour: 'red', ofTheLord: true }
  table[addDays(easter, -1)] = { name: 'Holy Saturday', rank: 'solemnity', colour: 'violet', ofTheLord: true }
  table[easter] = { name: 'Easter Sunday of the Resurrection of the Lord', rank: 'solemnity', colour: 'white', ofTheLord: true }
  table[addDays(easter, 7)] = { name: 'Second Sunday of Easter (Divine Mercy)', rank: 'solemnity', colour: 'white', ofTheLord: true }
  table[addDays(easter, 39)] = {
    name: 'The Ascension of the Lord',
    rank: 'solemnity',
    colour: 'white',
    ofTheLord: true,
    note: 'Transferred to the Seventh Sunday of Easter in many countries.',
  }
  table[addDays(easter, 49)] = { name: 'Pentecost Sunday', rank: 'solemnity', colour: 'red', ofTheLord: true }
  table[addDays(easter, 56)] = { name: 'The Most Holy Trinity', rank: 'solemnity', colour: 'white', ofTheLord: true }
  table[addDays(easter, 63)] = {
    name: 'The Most Holy Body and Blood of Christ',
    rank: 'solemnity',
    colour: 'white',
    ofTheLord: true,
    note: 'Observed on the preceding Thursday where it is a holy day of obligation.',
  }
  table[addDays(easter, 68)] = { name: 'The Most Sacred Heart of Jesus', rank: 'solemnity', colour: 'white', ofTheLord: true }
  table[addDays(easter, 69)] = { name: 'The Immaculate Heart of the Blessed Virgin Mary', rank: 'feast', colour: 'white' }

  table[holyFamily] = { name: 'The Holy Family of Jesus, Mary and Joseph', rank: 'feast', colour: 'white', ofTheLord: true }
  table[baptism] = { name: 'The Baptism of the Lord', rank: 'feast', colour: 'white', ofTheLord: true }
  table[christTheKing] = { name: 'Our Lord Jesus Christ, King of the Universe', rank: 'solemnity', colour: 'white', ofTheLord: true }
  return table
}

/** Gregorian Easter (Meeus/Jones/Butcher algorithm). */
export function easterFor(year: number): ISODate {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return makeISO(year, month, day)
}
