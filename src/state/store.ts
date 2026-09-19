/**
 * Application state.
 *
 * A single module-level store so that every screen sees the same entries, with
 * `useSyncExternalStore` for React. Every mutation writes through to
 * localStorage immediately and reports failure rather than losing the change.
 */

import { useSyncExternalStore } from 'react'
import type { ISODate } from '../liturgy/dates'
import type { PsalterWeek, Season } from '../liturgy/calendar'
import { newId, type MigrationReport } from '../data/migrate'
import { loadPrefs, loadStore, savePrefs, saveStore, type Prefs } from '../data/storage'
import {
  EMPTY_CONTENT,
  SECTIONS,
  SECTION_META,
  entryIsEmpty,
  keyId,
  sectionHasContent,
  type Entry,
  type CalendarScope,
  type CelebrationRank,
  type EntryContent,
  type Hour,
  type KeyType,
  type SectionId,
  type StoreFile,
} from '../data/types'
import { allSeedEntries, SEED_SOURCE, SEED_VERSION } from '../data/seed'
import { applyImport, type ImportOptions, type ImportPreview, type ImportSummary } from '../data/backup'

export interface AppState {
  file: StoreFile
  prefs: Prefs
  storageAvailable: boolean
  corruptBackupKey?: string
  migration: MigrationReport
  saveError?: string
}

function initialState(): AppState {
  const loaded = loadStore()
  return {
    file: loaded.file,
    prefs: loadPrefs(),
    storageAvailable: loaded.available,
    corruptBackupKey: loaded.corruptBackupKey,
    migration: loaded.report,
  }
}

let state: AppState = initialState()
const listeners = new Set<() => void>()

function emit(next: Partial<AppState>): void {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

function commit(file: StoreFile): void {
  const result = saveStore(file)
  emit({ file, saveError: result.ok ? undefined : result.error })
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getState(): AppState {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** Test helper: reload from storage. */
export function reloadFromStorage(): void {
  state = initialState()
  for (const listener of listeners) listener()
}

export function setPrefs(partial: Partial<Prefs>): void {
  const prefs = { ...state.prefs, ...partial }
  savePrefs(prefs)
  emit({ prefs })
}

export function dismissSaveError(): void {
  emit({ saveError: undefined })
}

export interface EntryKeyInput {
  keyType: KeyType
  hour: Hour
  season?: Season
  psalterWeek?: PsalterWeek
  weekday?: number
  weekOfSeason?: number
  celebrationId?: string
  celebrationName?: string
  celebrationRank?: CelebrationRank
  calendarScope?: CalendarScope
  celebrationMonth?: number
  celebrationDay?: number
  date?: ISODate
}

function keyFields(key: EntryKeyInput): Partial<Entry> {
  switch (key.keyType) {
    case 'date':
      return { keyType: 'date', hour: key.hour, date: key.date }
    case 'celebration':
      return {
        keyType: 'celebration',
        hour: key.hour,
        celebrationId: key.celebrationId,
        celebrationName: key.celebrationName,
        celebrationRank: key.celebrationRank,
        calendarScope: key.calendarScope,
        celebrationMonth: key.celebrationMonth,
        celebrationDay: key.celebrationDay,
      }
    case 'week':
      return { keyType: 'week', hour: key.hour, season: key.season, weekOfSeason: key.weekOfSeason }
    case 'psalter':
    default:
      return {
        keyType: 'psalter',
        hour: key.hour,
        season: key.season,
        psalterWeek: key.psalterWeek,
        weekday: key.weekday,
      }
  }
}

export function findByKey(key: EntryKeyInput): Entry | undefined {
  const target = keyId({ ...EMPTY_KEY, ...key } as Entry)
  return state.file.entries.find((entry) => keyId(entry) === target)
}

const EMPTY_KEY = { keyType: 'psalter', hour: 'morning' } as const

/**
 * Write one section against one key, creating the record if needed and leaving
 * every other section of that record untouched.
 */
export function saveSection(
  key: EntryKeyInput,
  section: SectionId,
  content: Partial<EntryContent>,
): Entry | undefined {
  const now = new Date().toISOString()
  const fields = SECTION_META[section].fields
  const patch: Partial<EntryContent> = {}
  for (const field of fields) patch[field] = (content[field] ?? '').trim()

  const existing = findByKey(key)
  let saved: Entry | undefined

  if (existing) {
    const updated: Entry = { ...existing, ...patch, updatedAt: now }
    delete updated.needsReview
    const entries = entryIsEmpty(updated)
      ? state.file.entries.filter((entry) => entry.id !== existing.id)
      : state.file.entries.map((entry) => (entry.id === existing.id ? updated : entry))
    saved = entryIsEmpty(updated) ? undefined : updated
    commit({ ...state.file, entries })
    return saved
  }

  const created: Entry = {
    ...EMPTY_CONTENT,
    ...keyFields(key),
    ...patch,
    id: newId(),
    keyType: key.keyType,
    hour: key.hour,
    createdAt: now,
    updatedAt: now,
  } as Entry

  if (entryIsEmpty(created)) return undefined
  commit({ ...state.file, entries: [...state.file.entries, created] })
  return created
}

/** Remove one section from a record; the record goes if nothing is left. */
export function clearSection(entryId: string, section: SectionId): void {
  const existing = state.file.entries.find((entry) => entry.id === entryId)
  if (!existing) return
  const patch: Partial<EntryContent> = {}
  for (const field of SECTION_META[section].fields) patch[field] = ''
  const updated: Entry = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  const entries = entryIsEmpty(updated)
    ? state.file.entries.filter((entry) => entry.id !== entryId)
    : state.file.entries.map((entry) => (entry.id === entryId ? updated : entry))
  commit({ ...state.file, entries })
}

/** Full-record save, used by the entry editor in the Library. */
export function saveEntry(entry: Entry): void {
  const now = new Date().toISOString()
  const exists = state.file.entries.some((item) => item.id === entry.id)
  const cleaned: Entry = { ...entry, updatedAt: now }
  delete cleaned.needsReview
  const entries = exists
    ? state.file.entries.map((item) => (item.id === entry.id ? cleaned : item))
    : [...state.file.entries, { ...cleaned, createdAt: cleaned.createdAt || now }]
  commit({ ...state.file, entries })
}

export function deleteEntry(id: string): void {
  commit({ ...state.file, entries: state.file.entries.filter((entry) => entry.id !== id) })
}

export function duplicateEntry(id: string): Entry | undefined {
  const source = state.file.entries.find((entry) => entry.id === id)
  if (!source) return undefined
  const now = new Date().toISOString()
  // The copy deliberately keeps the same key: the Library flags it as sharing a
  // key until the user gives it one of its own.
  const copy: Entry = { ...source, id: newId(), createdAt: now, updatedAt: now }
  commit({ ...state.file, entries: [...state.file.entries, copy] })
  return copy
}

export function markExported(at = new Date().toISOString()): void {
  commit({ ...state.file, meta: { ...state.file.meta, lastExportAt: at } })
}

export function commitImport(preview: ImportPreview, options: ImportOptions): ImportSummary {
  const { entries, summary } = applyImport(state.file.entries, preview, options)
  commit({ ...state.file, entries })
  return summary
}

export function addExampleEntries(): number {
  const existingKeys = new Set(state.file.entries.map((entry) => keyId(entry)))
  const toAdd = allSeedEntries().filter((entry) => !existingKeys.has(keyId(entry)))
  if (toAdd.length === 0) return 0
  commit({
    ...state.file,
    entries: [...state.file.entries, ...toAdd],
    meta: { ...state.file.meta, seedVersion: SEED_VERSION },
  })
  return toAdd.length
}

export function removeExampleEntries(): number {
  const remaining = state.file.entries.filter((entry) => entry.source !== SEED_SOURCE)
  const removed = state.file.entries.length - remaining.length
  if (removed === 0) return 0
  commit({ ...state.file, entries: remaining, meta: { ...state.file.meta, seedVersion: undefined } })
  return removed
}

export function hasExampleEntries(): boolean {
  return state.file.entries.some((entry) => entry.source === SEED_SOURCE)
}

export function sectionCount(entry: Entry): number {
  return SECTIONS.filter((section) => sectionHasContent(entry, section)).length
}
