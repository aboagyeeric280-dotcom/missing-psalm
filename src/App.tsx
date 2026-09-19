import { useCallback, useEffect, useMemo, useState } from 'react'
import { isISODate, todayISO } from './liturgy/dates'
import { HOURS, type Hour } from './data/types'
import { dismissSaveError, setPrefs, useAppState } from './state/store'
import { useAnnouncement } from './state/announce'
import { LookupScreen } from './components/LookupScreen'
import { LibraryScreen } from './components/LibraryScreen'
import { OverviewScreen } from './components/OverviewScreen'
import { BackupScreen } from './components/BackupScreen'
import type { ThemeName } from './data/storage'

type ScreenId = 'lookup' | 'library' | 'overview' | 'backup'

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: 'lookup', label: 'Lookup' },
  { id: 'library', label: 'Library' },
  { id: 'overview', label: 'Progress' },
  { id: 'backup', label: 'Backup' },
]

const THEMES: { id: ThemeName; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
]

function screenFromHash(): ScreenId {
  const hash = window.location.hash.replace('#', '')
  return SCREENS.some((screen) => screen.id === hash) ? (hash as ScreenId) : 'lookup'
}

export default function App() {
  const { prefs, saveError } = useAppState()
  const announcement = useAnnouncement()
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash())
  const [date, setDate] = useState<string>(() => todayISO())
  const [hour, setHour] = useState<Hour>(() =>
    HOURS.includes(prefs.lastHour as Hour) ? (prefs.lastHour as Hour) : 'morning',
  )
  const [online, setOnline] = useState<boolean>(() => navigator.onLine)

  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.dataset.textScale = prefs.textScale
  }, [prefs.theme, prefs.textScale])

  useEffect(() => {
    function handleHashChange() {
      setScreen(screenFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    function update() {
      setOnline(navigator.onLine)
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const goTo = useCallback((next: ScreenId) => {
    setScreen(next)
    window.location.hash = next
  }, [])

  const openDay = useCallback(
    (nextDate: string, nextHour: Hour) => {
      if (isISODate(nextDate)) setDate(nextDate)
      setHour(nextHour)
      goTo('lookup')
    },
    [goTo],
  )

  const changeHour = useCallback((next: Hour) => {
    setHour(next)
    setPrefs({ lastHour: next })
  }, [])

  const body = useMemo(() => {
    switch (screen) {
      case 'library':
        return <LibraryScreen />
      case 'overview':
        return <OverviewScreen onOpenDay={openDay} />
      case 'backup':
        return <BackupScreen />
      case 'lookup':
      default:
        return <LookupScreen date={date} hour={hour} onDateChange={setDate} onHourChange={changeHour} />
    }
  }, [screen, date, hour, openDay, changeHour])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="masthead">
        <div className="masthead__inner">
          <div>
            <h1 className="masthead__title">The Missing Parts</h1>
            <p className="masthead__subtitle">Companion to a printed psalter</p>
          </div>
          <div className="masthead__tools">
            <label htmlFor="theme-select" className="visually-hidden">
              Theme
            </label>
            <select
              id="theme-select"
              value={prefs.theme}
              onChange={(event) => setPrefs({ theme: event.target.value as ThemeName })}
              style={{ width: 'auto', minHeight: '40px' }}
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button--small"
              aria-pressed={prefs.textScale === 'large'}
              onClick={() => setPrefs({ textScale: prefs.textScale === 'large' ? 'normal' : 'large' })}
            >
              Larger text
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections of the app">
        <div className="tabs__inner">
          {SCREENS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tab"
              aria-current={screen === item.id ? 'page' : undefined}
              onClick={() => goTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="app__main" id="main" tabIndex={-1}>
        {saveError ? (
          <div className="notice notice--warn" role="alert">
            <div className="notice__title">That change could not be saved</div>
            <p>{saveError}</p>
            <button type="button" className="button button--small" onClick={dismissSaveError}>
              Dismiss
            </button>
          </div>
        ) : null}
        {!online ? (
          <p className="small muted" style={{ marginBottom: 'var(--space-4)' }}>
            You are offline. Everything here is stored on this device, so the app keeps working.
          </p>
        ) : null}
        {body}
      </main>

      <footer className="app__footer">
        <div className="app__footer-inner">
          <p>
            The Missing Parts holds the four changing sections your printed four-week psalter leaves out: the short
            reading, responsory, intercessions and concluding prayer. It is a companion to that book, not a
            breviary.
          </p>
          <p>
            Everything is saved in this browser on this device. No account, no server.{' '}
            <button type="button" className="button button--quiet button--small" onClick={() => goTo('backup')}>
              Export a backup
            </button>
          </p>
          <p className="tiny">
            Texts are shown exactly as you enter them. The app never supplies, completes or alters liturgical
            wording.
          </p>
        </div>
      </footer>

      <div aria-live="polite" role="status" className="visually-hidden">
        {announcement.message}
      </div>
      {announcement.message ? (
        <div className="toast" aria-hidden="true">
          {announcement.message}
        </div>
      ) : null}
    </div>
  )
}
