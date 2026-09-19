/**
 * Optional example material.
 *
 * IMPORTANT: this is **not** the Liturgy of the Hours. Every line below is
 * public-domain Scripture (Douay-Rheims, 1899 American edition) arranged as an
 * illustration of how the four sections are stored. It is never added
 * automatically — the user asks for it — and it is marked `source: 'example'`
 * so it can be found and removed at any time.
 */

import { EMPTY_CONTENT, type Entry } from './types'

export const SEED_VERSION = 1
export const SEED_SOURCE = 'example'

export const SEED_DESCRIPTION =
  'Four example entries using public-domain Scripture (Douay-Rheims, 1899). They show how the sections are stored; they are not the official liturgical texts.'

const NOTE = 'Example material supplied with the app. Public-domain Scripture, not the official Liturgy of the Hours.'
const TRANSLATION = 'Douay-Rheims (1899 American edition), public domain'

function make(partial: Partial<Entry> & Pick<Entry, 'hour'>): Entry {
  const now = new Date().toISOString()
  return {
    ...EMPTY_CONTENT,
    id: `seed_${partial.hour}_ot_p1_mon`,
    keyType: 'psalter',
    season: 'ordinary',
    psalterWeek: 1,
    weekday: 1,
    source: SEED_SOURCE,
    note: NOTE,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function seedEntries(): Entry[] {
  return [
    make({
      hour: 'morning',
      reference: 'Romans 13:11b, 12-13a',
      readingText:
        'It is now the hour for us to rise from sleep. The night is passed, and the day is at hand. Let us therefore cast off the works of darkness, and put on the armour of light. Let us walk honestly, as in the day.',
      translation: TRANSLATION,
      responsory:
        'V. In the morning I will stand before thee, and will see.\nR. In the morning I will stand before thee, and will see.\n\nV. For thou art not a God that willest iniquity.\nR. In the morning I will stand before thee, and will see.\n\n— Psalm 5:4-5, Douay-Rheims (public domain)',
      intercessions:
        'Let us bless Christ, who gives light to every day:\n— Lord, hear us.\n\nFor those who begin their work this morning:\n— Lord, hear us.\n\nFor those who have no rest and no shelter:\n— Lord, hear us.\n\n(Example petitions. Replace them with the text you pray from.)',
    }),
    make({
      hour: 'midday',
      reference: '1 Peter 1:13-14',
      readingText:
        'Wherefore having the loins of your mind girt up, being sober, trust perfectly in the grace which is offered you. As children of obedience, not fashioned according to the former desires of your ignorance.',
      translation: TRANSLATION,
      responsory:
        'V. The Lord is my helper: I will not fear what man can do unto me.\nR. The Lord is my helper: I will not fear what man can do unto me.\n\n— Psalm 117:6, Douay-Rheims (public domain)',
    }),
    make({
      hour: 'evening',
      reference: 'Colossians 1:9b-11a',
      readingText:
        'That you may be filled with the knowledge of his will, in all wisdom and spiritual understanding: that you may walk worthy of God, in all things pleasing; being fruitful in every good work, and increasing in the knowledge of God.',
      translation: TRANSLATION,
      responsory:
        'V. Let my prayer be directed as incense in thy sight.\nR. Let my prayer be directed as incense in thy sight.\n\nV. The lifting up of my hands, as evening sacrifice.\nR. Let my prayer be directed as incense in thy sight.\n\n— Psalm 140:2, Douay-Rheims (public domain)',
    }),
    make({
      hour: 'night',
      reference: 'Jeremiah 14:9a',
      readingText:
        'But thou, O Lord, art among us, and thy name is called upon by us: forsake us not.',
      translation: TRANSLATION,
      responsory:
        'V. Into thy hands, O Lord, I commend my spirit.\nR. Into thy hands, O Lord, I commend my spirit.\n\n— Psalm 30:6, Douay-Rheims (public domain)',
    }),
  ]
}

/** A week-keyed example, to show how a concluding prayer is stored. */
export function seedWeekEntries(): Entry[] {
  const now = new Date().toISOString()
  return [
    {
      ...EMPTY_CONTENT,
      id: 'seed_week_ot1_morning',
      keyType: 'week',
      hour: 'morning',
      season: 'ordinary',
      weekOfSeason: 1,
      concludingPrayer:
        'And let the brightness of the Lord our God be upon us: and direct thou the works of our hands over us; yea, the work of our hands do thou direct.\n\n— Psalm 89:17, Douay-Rheims (public domain). Example only; replace it with the concluding prayer you pray from.',
      source: SEED_SOURCE,
      note: NOTE,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function allSeedEntries(): Entry[] {
  return [...seedEntries(), ...seedWeekEntries()]
}
