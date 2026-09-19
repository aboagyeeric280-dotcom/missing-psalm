import { useMemo, useState } from 'react'
import type { LiturgicalDay } from '../liturgy/calendar'
import { formatDateOnly } from '../liturgy/dates'
import { celebrationIdFor } from '../liturgy/celebrations'
import {
  EMPTY_CONTENT,
  HOUR_META,
  SECTION_META,
  isValidAnnualDate,
  sectionHasContent,
  type Entry,
  type EntryContent,
  type Hour,
  type KeyType,
  type SectionId,
} from '../data/types'
import { describeKey, explainKey } from '../data/resolve'
import { clearSection, findByKey, saveSection } from '../state/store'
import { announce } from '../state/announce'
import { Dialog, ConfirmDialog } from './Dialog'
import { KeyChooser, KeyDetails, type KeyDraft } from './KeyChooser'
import { SectionFields } from './SectionFields'

interface SectionEditorDialogProps {
  section: SectionId
  day: LiturgicalDay
  hour: Hour
  /** The record currently supplying this section, when there is one. */
  currentEntry?: Entry
  onClose: () => void
}

function draftFromDay(day: LiturgicalDay, hour: Hour, keyType: KeyType): KeyDraft {
  return {
    keyType,
    hour,
    season: day.season,
    psalterWeek: day.psalterWeek,
    weekday: day.weekday,
    weekOfSeason: day.weekOfSeason,
    celebrationId: day.celebration ? celebrationIdFor(day.celebration.name) : '',
    celebrationName: day.celebration?.name ?? '',
    celebrationRank: day.celebration?.rank ?? 'memorial',
    calendarScope: 'general',
    celebrationMonth: Number(day.date.slice(5, 7)),
    celebrationDay: Number(day.date.slice(8, 10)),
    date: day.date,
  }
}

function contentOf(entry: Entry | undefined): EntryContent {
  if (!entry) return { ...EMPTY_CONTENT }
  const { reference, readingText, translation, responsory, intercessions, concludingPrayer } = entry
  return { reference, readingText, translation, responsory, intercessions, concludingPrayer }
}

export function SectionEditorDialog({ section, day, hour, currentEntry, onClose }: SectionEditorDialogProps) {
  const meta = SECTION_META[section]
  const initialKeyType: KeyType =
    currentEntry?.keyType ??
    (day.celebration ? 'celebration' : day.prefersExactDate ? 'date' : meta.defaultKeyType)

  const [key, setKey] = useState<KeyDraft>(() => {
    const base = draftFromDay(day, hour, initialKeyType)
    if (!currentEntry) return base
    return {
      ...base,
      keyType: currentEntry.keyType,
      hour: currentEntry.hour,
      season: currentEntry.season ?? base.season,
      psalterWeek: currentEntry.psalterWeek ?? base.psalterWeek,
      weekday: currentEntry.weekday ?? base.weekday,
      weekOfSeason: currentEntry.weekOfSeason ?? base.weekOfSeason,
      celebrationId: currentEntry.celebrationId ?? base.celebrationId,
      celebrationName: currentEntry.celebrationName ?? base.celebrationName,
      celebrationRank: currentEntry.celebrationRank ?? base.celebrationRank,
      calendarScope: currentEntry.calendarScope ?? base.calendarScope,
      celebrationMonth: currentEntry.celebrationMonth ?? base.celebrationMonth,
      celebrationDay: currentEntry.celebrationDay ?? base.celebrationDay,
      date: currentEntry.date ?? base.date,
    }
  })
  const [content, setContent] = useState<EntryContent>(() => contentOf(currentEntry))
  const [dirty, setDirty] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const targetEntry = useMemo(() => findByKey(key), [key])
  const targetHasSection = targetEntry ? sectionHasContent(targetEntry, section) : false
  const willReplace = targetHasSection && targetEntry?.id !== currentEntry?.id

  function changeKey(next: KeyDraft) {
    setKey(next)
    if (!dirty) {
      // Nothing typed yet: show whatever is already stored against the new key.
      const existing = findByKey(next)
      setContent(contentOf(existing))
    }
  }

  function handleSave() {
    const saved = saveSection(key, section, content)
    announce(
      saved
        ? `${meta.label} saved. ${explainKey(key.keyType, key)}`
        : `${meta.label} removed because it was left empty.`,
    )
    onClose()
  }

  function handleRemove() {
    if (currentEntry) {
      clearSection(currentEntry.id, section)
      announce(`${meta.label} removed.`)
    }
    setConfirmRemove(false)
    onClose()
  }

  const hasText = SECTION_META[section].fields.some((field) => (content[field] ?? '').trim().length > 0)
  const keyIsComplete =
    key.keyType !== 'celebration' ||
    (key.celebrationName.trim().length > 0 &&
      (key.celebrationId.length > 0 || isValidAnnualDate(key.celebrationMonth, key.celebrationDay)))

  return (
    <>
      <Dialog
        title={`${currentEntry ? 'Edit' : 'Add'} ${meta.label.toLowerCase()}`}
        subtitle={
          <>
            {day.title} · {HOUR_META[hour].label} · {formatDateOnly(day.date)}
          </>
        }
        onClose={onClose}
        actions={
          <>
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            {currentEntry ? (
              <button type="button" className="button button--danger" onClick={() => setConfirmRemove(true)}>
                Remove this section
              </button>
            ) : null}
            <button
              type="button"
              className="button button--primary"
              onClick={handleSave}
              disabled={!hasText || !keyIsComplete}
            >
              Save {meta.label.toLowerCase()}
            </button>
          </>
        }
      >
        <div className="stack">
          <SectionFields
            section={section}
            value={content}
            onChange={(next) => {
              setContent(next)
              setDirty(true)
            }}
            autoFocus
          />

          <KeyChooser
            value={key}
            onChange={changeKey}
            recommendDate={day.prefersExactDate && !day.celebration}
            recommendCelebration={Boolean(day.celebration)}
          />

          {key.keyType === 'celebration' ? (
            <>
              <KeyDetails value={key} onChange={changeKey} showHour={false} />
              {!keyIsComplete ? (
                <p className="small" style={{ color: 'var(--danger)' }}>
                  Give the celebration a name and a valid annual date before saving.
                </p>
              ) : null}
            </>
          ) : null}

          {day.celebration && key.keyType !== 'celebration' && key.keyType !== 'date' ? (
            <p className="notice notice--info">
              <strong className="notice__title">Today is {day.celebration.name}</strong>
              A celebration entry can return whenever this celebration occurs. Use an exact date instead for a
              one-year transfer.
            </p>
          ) : day.prefersExactDate && key.keyType !== 'date' && key.keyType !== 'celebration' ? (
            <p className="notice notice--info">
              <strong className="notice__title">Today has proper texts</strong>
              {day.title} normally has its own material. An exact-date entry keeps the recurring psalter
              material underneath it untouched.
            </p>
          ) : null}

          {key.keyType === 'date' ? (
            <p className="small muted">
              Saving this does not delete anything. Any celebration, psalter or week material for {formatDateOnly(key.date)}
              {' '}stays exactly as it is and keeps appearing on other days.
            </p>
          ) : null}

          {willReplace ? (
            <p className="notice notice--warn">
              <strong className="notice__title">There is already a {meta.label.toLowerCase()} here</strong>
              {describeKey(targetEntry as Entry)} already has a {meta.label.toLowerCase()}. Saving replaces that
              wording.
            </p>
          ) : null}

          {key.keyType !== 'celebration' ? (
            <details className="advanced">
              <summary>Advanced: change what this is keyed to</summary>
              <p className="small muted">
                These are filled in from the date you were looking at. Change them only if you want this to apply
                somewhere else.
              </p>
              <KeyDetails value={key} onChange={changeKey} />
            </details>
          ) : null}
        </div>
      </Dialog>

      {confirmRemove ? (
        <ConfirmDialog
          title={`Remove this ${meta.label.toLowerCase()}?`}
          body={
            <>
              <p>
                This removes the {meta.label.toLowerCase()} from{' '}
                <strong>{currentEntry ? describeKey(currentEntry) : ''}</strong>.
              </p>
              <p className="small muted">
                The other sections of that record are kept. If it was the only section left, the record itself is
                removed.
              </p>
            </>
          }
          confirmLabel="Remove"
          destructive
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(false)}
        />
      ) : null}
    </>
  )
}
