# Required self-checks

`npm run self-check` runs both suites and prints this list with a pass or fail against
each item. A check that no test claims is reported as **NOT COVERED**, so the report
cannot quietly go stale.

Tests claim a check by carrying `self-check N` in their `describe` title.

| # | Check | Where |
| --- | --- | --- |
| 1 | A psalter entry saved for Ordinary Time, Psalter Week I, Monday, Morning appears again on Monday of the Fifth Week in Ordinary Time | `src/data/resolve.test.ts` |
| 2 | A concluding prayer saved for the Eighth Week in Ordinary Time does not appear in the Twelfth Week | `src/data/resolve.test.ts` |
| 3 | An exact-date entry saved for 20 December overrides the matching psalter entry for that date, while the psalter entry remains available on another matching day | `src/data/resolve.test.ts` |
| 4 | All four sections resolve independently | `src/data/resolve.test.ts` |
| 5 | Existing local data survives an application upgrade | `src/data/migrate.test.ts` |
| 6 | Export followed by import restores the same data | `src/data/backup.test.ts` |
| 7 | An invalid import does not modify existing data | `src/data/backup.test.ts` |
| 8 | Merge import preserves non-conflicting current entries and clearly reports conflicts | `src/data/backup.test.ts` |
| 9 | The app remains usable offline after its first successful load | `e2e/app.spec.ts` (Chromium) |
| 10 | Core workflows work on a 375-pixel-wide mobile screen | `e2e/app.spec.ts` (Chromium, 375×667) |

Beyond the required ten, the suites also cover:

- the liturgical calendar against known dates for Easter, Advent, the Baptism of the
  Lord, Holy Family and Christ the King, and every day across five years for a valid
  season, week and psalter week (`src/liturgy/calendar.test.ts`);
- migration idempotency, legacy spellings of hour/season/psalter week/weekday, unreadable
  stored data, and preservation of unrecognised fields (`src/data/migrate.test.ts`);
- the interface itself: empty states, per-section editing, an exact-date override made
  through the editor, the Library's search, filters and delete confirmation
  (`src/components/app.test.tsx`);
- reload persistence, every screen rendering, touch-target sizes and keyboard dismissal
  of the editor (`e2e/app.spec.ts`).
