# The Missing Parts

A local-first companion for the Roman Rite Liturgy of the Hours (Ordinary Form).

A printed four-week psalter gives you the psalms and canticles but leaves out four
sections that change with the liturgical day:

1. the short reading,
2. the responsory,
3. the intercessions,
4. the concluding prayer.

This app holds those four sections, keyed the way the books key them, and shows the
right ones when you pick a date and an hour. It is a companion to your book, not a
breviary: it has no psalms, no hymns and no antiphons.

Everything is stored in your browser on your device. There is no account, no server
and no external database. Complete JSON export and import let you back your material
up and move it between devices.

## Running it

```bash
npm install
npm run dev        # development server
npm run verify     # typecheck, lint, unit tests, production build
npm run e2e        # browser tests: offline behaviour and a 375px screen
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## How material is stored

Each record carries a `keyType` that decides when it applies:

| `keyType` | Keyed by | Typical use |
| --- | --- | --- |
| `psalter` | season + psalter week (I–IV) + weekday + hour | material that repeats every four weeks |
| `week` | season + week of the season + hour | material belonging to one week, such as a concluding prayer |
| `celebration` | celebration + rank + calendar + hour | optional memorials, memorials, feasts and solemnities that recur |
| `date` | exact calendar date + hour | 17–24 December, the Christmas octave and a celebration transferred in one year |

Every record keeps the same content fields: `reference`, `readingText`, `translation`,
`responsory`, `intercessions`, `concludingPrayer`. The Scripture reference, the reading
text and the translation tag are stored separately; the app never assumes a translation
and always displays the tag you entered.

### Resolution

The four sections resolve **independently**, each taking the most specific record that
actually contains it:

```
exact date  >  celebration  >  week of season  >  psalter
```

A more specific record overrides only the sections it contains. An exact-date record
holding just the intercessions does not hide the psalter's reading or the week's
concluding prayer, and it never deletes them — they carry on appearing on every other
day they match. The Lookup screen labels the source of each section and says plainly
when one record is overriding another.

A fixed celebration repeats on its month and day every year. A celebration already
recognised by the built-in calendar carries a stable identifier, so a movable observance
such as Easter follows its calculated date. An exact-date entry still wins when a feast
or solemnity is transferred in one particular year.

### Editor defaults

Short reading, responsory and intercessions default to `psalter`; the concluding prayer
defaults to `week`. On a recognised feast or solemnity, the editor suggests
`celebration`; on 17–24 December and days in the Christmas octave it suggests `date`.
For a memorial not in the built-in calendar, choose **This celebration each year** and
enter its name, rank, calendar, month and day. Every choice is explained in plain language — "This will repeat every four
weeks on Monday at Morning, in Ordinary Time" — and the underlying key fields are filled
in from the date you were looking at. They can still be changed under *Advanced*.

## Your data

- The storage key is `the-missing-parts-entries-v1` and has never changed.
- Stored data carries a schema version; migrations are idempotent and never discard
  anything. Legacy records without a `keyType` stay usable: readings, responsories and
  intercessions migrate to `psalter`, and a legacy concluding prayer is lifted into its
  own `week` record when the record says which week it belongs to.
- Records that cannot be keyed confidently are kept and flagged **Needs review** in the
  Library rather than dropped.
- Fields the app does not recognise are preserved, so a backup from a newer version
  survives a round trip.
- If the stored text is ever unreadable, a copy is kept under a timestamped key and the
  original is left in place. Nothing is cleared silently.
- Import validates first and shows a summary: how many records, when the backup was
  made, what is new, what would be added to existing records, and every conflict with the
  two wordings side by side. You then choose **Merge** or **Replace**; replacing asks for
  confirmation. If the file cannot be used, nothing is written.

## The liturgical calendar

Seasons, weeks, psalter weeks and liturgical colours are computed from three anchors:
Easter (Gregorian, Meeus/Jones/Butcher), the First Sunday of Advent, and the Baptism of
the Lord (the Sunday after 6 January). Ordinary Time is numbered forward from the Baptism
and backward from the 34th week, which ends before Advent.

The built-in sanctoral labels **solemnities and feasts of the General Roman Calendar**.
Memorials are not preloaded, but you can add them as annual celebration entries and mark
them General, National, Diocesan, or Local/community. Regional calendars,
transfers of impeded solemnities and local observances are not modelled — where a day is
commonly transferred (the Epiphany, the Ascension, Corpus Christi) the app says so on the
day itself. Use an exact-date entry when a celebration is transferred for a particular year.

## Texts

The app never invents, completes, paraphrases or alters liturgical wording. It renders
exactly what you typed, keeping your line breaks, and always shows the translation tag
with a reading. No copyrighted liturgical or biblical text ships with the app.

The optional example entries on the Backup screen use public-domain Scripture
(Douay-Rheims, 1899 American edition), are labelled *Example* wherever they appear, are
added only when you ask for them, and can be removed in one step.

## Accessibility

Full keyboard operation with visible focus, semantic headings and labels, 44px touch
targets, status messages announced through a polite live region, no information carried
by colour alone (every liturgical colour and every stored/missing state is also stated in
words), and `prefers-reduced-motion` respected. Light, sepia and dark themes, plus a
larger-text setting.

## Offline

A service worker caches the app shell and its assets on the first successful load, so it
keeps working with no network at all. The data was never on a network to begin with.

## Tests

`npm run verify` runs the unit and component suites (Vitest, jsdom), and `npm run e2e`
runs the browser suite (Playwright, Chromium, at 375px and 1280px). Between them they
cover the ten required self-checks, listed in `SELF-CHECKS.md`.
