import { useMemo, useState } from 'react'
import { ROMAN_WEEK, formatShortDate } from '../liturgy/dates'
import { SEASONS, SEASON_NAMES, weekLabelFor, type Season } from '../liturgy/calendar'
import {
  HOURS,
  HOUR_META,
  KEY_TYPES,
  KEY_TYPE_LABELS,
  SECTIONS,
  SECTION_META,
  keyId,
  sectionsPresent,
  type Entry,
  type Hour,
  type KeyType,
} from '../data/types'
import { describeKey } from '../data/resolve'
import { deleteEntry, duplicateEntry, useAppState } from '../state/store'
import { announce } from '../state/announce'
import { ConfirmDialog } from './Dialog'
import { EntryEditorDialog } from './EntryEditorDialog'

type Show = 'all' | 'incomplete' | 'review' | 'duplicates' | 'example'

const SHOW_LABELS: Record<Show, string> = {
  all: 'Everything',
  incomplete: 'Records with missing sections',
  review: 'Records needing review',
  duplicates: 'Duplicate or conflicting records',
  example: 'Example material',
}

function entryText(entry: Entry): string {
  return [
    entry.reference,
    entry.readingText,
    entry.translation,
    entry.responsory,
    entry.intercessions,
    entry.concludingPrayer,
    entry.note ?? '',
  ]
    .join(' \n ')
    .toLowerCase()
}

function sortKey(entry: Entry): string {
  const seasonIndex = entry.season ? SEASONS.indexOf(entry.season) : 9
  return [
    entry.keyType === 'date' ? '0' : entry.keyType === 'week' ? '1' : '2',
    entry.date ?? '',
    String(seasonIndex),
    String(entry.weekOfSeason ?? entry.psalterWeek ?? 0).padStart(2, '0'),
    String(entry.weekday ?? 0),
    entry.hour,
  ].join('|')
}

export function LibraryScreen() {
  const { file } = useAppState()
  const [query, setQuery] = useState('')
  const [season, setSeason] = useState<Season | 'any'>('any')
  const [hour, setHour] = useState<Hour | 'any'>('any')
  const [keyType, setKeyType] = useState<KeyType | 'any'>('any')
  const [psalterWeek, setPsalterWeek] = useState<string>('any')
  const [weekOfSeason, setWeekOfSeason] = useState<string>('any')
  const [show, setShow] = useState<Show>('all')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState<Entry | null>(null)

  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of file.entries) {
      const id = keyId(entry)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id))
  }, [file.entries])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return file.entries
      .filter((entry) => {
        if (needle && !entryText(entry).includes(needle)) return false
        if (season !== 'any' && entry.season !== season) return false
        if (hour !== 'any' && entry.hour !== hour) return false
        if (keyType !== 'any' && entry.keyType !== keyType) return false
        if (psalterWeek !== 'any' && String(entry.psalterWeek ?? '') !== psalterWeek) return false
        if (weekOfSeason !== 'any' && String(entry.weekOfSeason ?? '') !== weekOfSeason) return false
        if (show === 'incomplete' && sectionsPresent(entry).length === 4) return false
        if (show === 'review' && !entry.needsReview) return false
        if (show === 'duplicates' && !duplicateKeys.has(keyId(entry))) return false
        if (show === 'example' && entry.source !== 'example') return false
        return true
      })
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  }, [file.entries, query, season, hour, keyType, psalterWeek, weekOfSeason, show, duplicateKeys])

  const weekOptions = useMemo(() => {
    const values = new Set<number>()
    for (const entry of file.entries) {
      if (entry.weekOfSeason !== undefined) values.add(entry.weekOfSeason)
    }
    return [...values].sort((a, b) => a - b)
  }, [file.entries])

  function resetFilters() {
    setQuery('')
    setSeason('any')
    setHour('any')
    setKeyType('any')
    setPsalterWeek('any')
    setWeekOfSeason('any')
    setShow('all')
  }

  const filtersActive =
    query !== '' ||
    season !== 'any' ||
    hour !== 'any' ||
    keyType !== 'any' ||
    psalterWeek !== 'any' ||
    weekOfSeason !== 'any' ||
    show !== 'all'

  return (
    <div>
      <h2 className="panel__title">Your material</h2>
      <p className="small muted" style={{ marginBottom: 'var(--space-4)' }}>
        Everything you have stored, in one place. {file.entries.length} record
        {file.entries.length === 1 ? '' : 's'} saved in this browser.
      </p>

      {duplicateKeys.size > 0 ? (
        <div className="notice notice--warn">
          <div className="notice__title">
            {duplicateKeys.size} key{duplicateKeys.size === 1 ? ' has' : 's have'} more than one record
          </div>
          <p>
            When two records share a key, only the most recently edited one is shown in Lookup. Use the filter
            below to find them, then merge or delete what you do not need.
          </p>
          <button type="button" className="button button--small" onClick={() => setShow('duplicates')}>
            Show them
          </button>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="library-search">Search words or Scripture reference</label>
        <input
          type="search"
          id="library-search"
          value={query}
          placeholder="e.g. rejoice, or Romans 13"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="filters">
        <div>
          <label htmlFor="filter-season">Season</label>
          <select id="filter-season" value={season} onChange={(event) => setSeason(event.target.value as Season | 'any')}>
            <option value="any">Any season</option>
            {SEASONS.map((item) => (
              <option key={item} value={item}>
                {SEASON_NAMES[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-hour">Hour</label>
          <select id="filter-hour" value={hour} onChange={(event) => setHour(event.target.value as Hour | 'any')}>
            <option value="any">Any hour</option>
            {HOURS.map((item) => (
              <option key={item} value={item}>
                {HOUR_META[item].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-keytype">Key type</label>
          <select
            id="filter-keytype"
            value={keyType}
            onChange={(event) => setKeyType(event.target.value as KeyType | 'any')}
          >
            <option value="any">Any key type</option>
            {KEY_TYPES.map((item) => (
              <option key={item} value={item}>
                {KEY_TYPE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-psalter">Psalter week</label>
          <select id="filter-psalter" value={psalterWeek} onChange={(event) => setPsalterWeek(event.target.value)}>
            <option value="any">Any psalter week</option>
            {[1, 2, 3, 4].map((week) => (
              <option key={week} value={String(week)}>
                Week {ROMAN_WEEK[week]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-week">Week of season</label>
          <select id="filter-week" value={weekOfSeason} onChange={(event) => setWeekOfSeason(event.target.value)}>
            <option value="any">Any week</option>
            {weekOptions.map((week) => (
              <option key={week} value={String(week)}>
                Week {week}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-show">Show</label>
          <select id="filter-show" value={show} onChange={(event) => setShow(event.target.value as Show)}>
            {(Object.keys(SHOW_LABELS) as Show[]).map((item) => (
              <option key={item} value={item}>
                {SHOW_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
        <p className="small" role="status">
          Showing {filtered.length} of {file.entries.length} record{file.entries.length === 1 ? '' : 's'}.
        </p>
        {filtersActive ? (
          <button type="button" className="button button--small" onClick={resetFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <p>
            {file.entries.length === 0
              ? 'You have not stored anything yet. Open Lookup, choose a day and hour, and add a section.'
              : 'Nothing matches these filters.'}
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {filtered.map((entry) => {
            const present = sectionsPresent(entry)
            const missing = SECTIONS.filter((section) => !present.includes(section))
            const duplicate = duplicateKeys.has(keyId(entry))
            return (
              <li className="entry" key={entry.id}>
                <div className="entry__head">
                  <h3 className="entry__key">{describeKey(entry)}</h3>
                  <span className={`badge badge--${entry.keyType}`}>{KEY_TYPE_LABELS[entry.keyType]}</span>
                </div>

                <div className="entry__sections">
                  {present.map((section) => (
                    <span className="badge badge--ok" key={section}>
                      {SECTION_META[section].shortLabel}
                    </span>
                  ))}
                  {missing.map((section) => (
                    <span className="badge" key={section}>
                      No {SECTION_META[section].shortLabel.toLowerCase()}
                    </span>
                  ))}
                  {entry.needsReview ? <span className="badge badge--warn">Needs review</span> : null}
                  {duplicate ? <span className="badge badge--warn">Shares a key</span> : null}
                  {entry.source === 'example' ? <span className="badge badge--example">Example</span> : null}
                </div>

                {entry.reference ? <p className="small muted">{entry.reference}</p> : null}
                <p className="entry__preview">
                  {entry.readingText || entry.responsory || entry.intercessions || entry.concludingPrayer}
                </p>
                {entry.note ? <p className="tiny muted">Note: {entry.note}</p> : null}
                <p className="tiny muted">
                  {entry.keyType === 'week' && entry.season && entry.weekOfSeason !== undefined
                    ? `${weekLabelFor(entry.season, entry.weekOfSeason)} · `
                    : ''}
                  Last edited {formatShortDate(entry.updatedAt.slice(0, 10))}
                </p>

                <div className="entry__actions">
                  <button type="button" className="button button--small" onClick={() => setEditing(entry)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => {
                      const copy = duplicateEntry(entry.id)
                      if (copy) {
                        setEditing(copy)
                        announce('Copy created. Change its key so it applies somewhere else.')
                      }
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="button button--small button--danger"
                    onClick={() => setDeleting(entry)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing ? <EntryEditorDialog entry={editing} onClose={() => setEditing(null)} /> : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this entry?"
          body={
            <>
              <p>
                <strong>{describeKey(deleting)}</strong>
              </p>
              <p>
                This deletes {sectionsPresent(deleting).length} section
                {sectionsPresent(deleting).length === 1 ? '' : 's'} of stored text. It cannot be undone from inside
                the app.
              </p>
              <p className="small muted">If you keep backups, you can restore it by importing one.</p>
            </>
          }
          confirmLabel="Delete permanently"
          destructive
          onConfirm={() => {
            deleteEntry(deleting.id)
            announce('Entry deleted.')
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  )
}
