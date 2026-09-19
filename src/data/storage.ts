/**
 * Local storage access.
 *
 * The storage key has never changed and must not change: existing installations
 * of this app keep their material under `the-missing-parts-entries-v1`.
 */

import { migrateStore, CURRENT_SCHEMA_VERSION, type MigrationReport } from './migrate'
import type { StoreFile } from './types'

export const STORAGE_KEY = 'the-missing-parts-entries-v1'
export const PREFS_KEY = 'the-missing-parts-prefs-v1'

export type ThemeName = 'light' | 'sepia' | 'dark'

export interface Prefs {
  theme: ThemeName
  textScale: 'normal' | 'large'
  lastHour?: string
}

export const DEFAULT_PREFS: Prefs = { theme: 'light', textScale: 'normal' }

export interface LoadResult {
  file: StoreFile
  report: MigrationReport
  /** Set when stored data could not be parsed; a copy is kept under this key. */
  corruptBackupKey?: string
  available: boolean
}

function storage(): Storage | null {
  try {
    const probe = '__tmp_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export function emptyStore(): StoreFile {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: [],
    meta: { createdAt: new Date().toISOString() },
  }
}

export function loadStore(): LoadResult {
  const store = storage()
  if (!store) {
    return {
      file: emptyStore(),
      report: migrateStore(null).report,
      available: false,
    }
  }

  const raw = store.getItem(STORAGE_KEY)
  if (raw === null) {
    return { file: emptyStore(), report: migrateStore(null).report, available: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Keep the unreadable text. Nothing is ever discarded silently.
    const backupKey = `${STORAGE_KEY}.unreadable-${new Date().toISOString()}`
    try {
      store.setItem(backupKey, raw)
    } catch {
      /* out of space: the original key is still untouched */
    }
    return {
      file: emptyStore(),
      report: migrateStore(null).report,
      corruptBackupKey: backupKey,
      available: true,
    }
  }

  const { file, report } = migrateStore(parsed)
  return { file, report, available: true }
}

export function saveStore(file: StoreFile): { ok: boolean; error?: string } {
  const store = storage()
  if (!store) return { ok: false, error: 'This browser is not allowing the app to save data.' }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(file))
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'QuotaExceededError'
        ? 'This browser has run out of space for saved data. Export a backup, then remove some entries.'
        : 'Saving failed. Your existing saved material has not been changed.'
    return { ok: false, error: message }
  }
}

export function loadPrefs(): Prefs {
  const store = storage()
  if (!store) return DEFAULT_PREFS
  try {
    const raw = store.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      theme: parsed.theme === 'sepia' || parsed.theme === 'dark' ? parsed.theme : 'light',
      textScale: parsed.textScale === 'large' ? 'large' : 'normal',
      lastHour: typeof parsed.lastHour === 'string' ? parsed.lastHour : undefined,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: Prefs): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* preferences are not important enough to interrupt the user */
  }
}
