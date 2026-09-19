import { useState } from 'react'
import { todayISO } from '../liturgy/dates'
import { resolveLiturgicalDay } from '../liturgy/calendar'
import {
  EMPTY_CONTENT,
  SECTIONS,
  SECTION_META,
  entryIsEmpty,
  isValidAnnualDate,
  type Entry,
  type EntryContent,
} from '../data/types'
import { describeKey, explainKey } from '../data/resolve'
import { saveEntry } from '../state/store'
import { announce } from '../state/announce'
import { Dialog } from './Dialog'
import { KeyChooser, KeyDetails, type KeyDraft } from './KeyChooser'
import { SectionFields } from './SectionFields'

interface EntryEditorDialogProps {
  entry: Entry
  onClose: () => void
}

/** Full-record editing, used from the Library where the record is the subject. */
export function EntryEditorDialog({ entry, onClose }: EntryEditorDialogProps) {
  const fallback = resolveLiturgicalDay(todayISO())
  const [key, setKey] = useState<KeyDraft>({
    keyType: entry.keyType,
    hour: entry.hour,
    season: entry.season ?? fallback.season,
    psalterWeek: entry.psalterWeek ?? fallback.psalterWeek,
    weekday: entry.weekday ?? fallback.weekday,
    weekOfSeason: entry.weekOfSeason ?? fallback.weekOfSeason,
    celebrationId: entry.celebrationId ?? '',
    celebrationName: entry.celebrationName ?? '',
    celebrationRank: entry.celebrationRank ?? 'memorial',
    calendarScope: entry.calendarScope ?? 'general',
    celebrationMonth: entry.celebrationMonth ?? Number(fallback.date.slice(5, 7)),
    celebrationDay: entry.celebrationDay ?? Number(fallback.date.slice(8, 10)),
    date: entry.date ?? fallback.date,
  })
  const [content, setContent] = useState<EntryContent>({
    ...EMPTY_CONTENT,
    reference: entry.reference,
    readingText: entry.readingText,
    translation: entry.translation,
    responsory: entry.responsory,
    intercessions: entry.intercessions,
    concludingPrayer: entry.concludingPrayer,
  })
  const [note, setNote] = useState(entry.note ?? '')

  function handleSave() {
    const next: Entry = {
      ...entry,
      ...content,
      note: note.trim() || undefined,
      keyType: key.keyType,
      hour: key.hour,
      season: key.keyType === 'psalter' || key.keyType === 'week' ? key.season : undefined,
      psalterWeek: key.keyType === 'psalter' ? key.psalterWeek : undefined,
      weekday: key.keyType === 'psalter' ? key.weekday : undefined,
      weekOfSeason: key.keyType === 'week' ? key.weekOfSeason : undefined,
      celebrationId: key.keyType === 'celebration' ? key.celebrationId || undefined : undefined,
      celebrationName: key.keyType === 'celebration' ? key.celebrationName.trim() : undefined,
      celebrationRank: key.keyType === 'celebration' ? key.celebrationRank : undefined,
      calendarScope: key.keyType === 'celebration' ? key.calendarScope : undefined,
      celebrationMonth: key.keyType === 'celebration' ? key.celebrationMonth : undefined,
      celebrationDay: key.keyType === 'celebration' ? key.celebrationDay : undefined,
      date: key.keyType === 'date' ? key.date : undefined,
    }
    saveEntry(next)
    announce(`Entry saved. ${describeKey(next)}.`)
    onClose()
  }

  const empty = entryIsEmpty({ ...entry, ...content })
  const keyIsComplete =
    key.keyType !== 'celebration' ||
    (key.celebrationName.trim().length > 0 &&
      (key.celebrationId.length > 0 || isValidAnnualDate(key.celebrationMonth, key.celebrationDay)))

  return (
    <Dialog
      title="Edit entry"
      subtitle={describeKey(entry)}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleSave}
            disabled={empty || !keyIsComplete}
          >
            Save entry
          </button>
        </>
      }
    >
      <div className="stack">
        {entry.needsReview ? (
          <p className="notice notice--warn">
            <strong className="notice__title">Needs review</strong>
            This record does not have everything needed to match a day. Check the key below.
          </p>
        ) : null}

        <KeyChooser value={key} onChange={setKey} legend="What does this entry apply to?" />
        <p className="small muted">{explainKey(key.keyType, key)}</p>
        <KeyDetails value={key} onChange={setKey} />
        {!keyIsComplete ? (
          <p className="small" style={{ color: 'var(--danger)' }}>
            Give the celebration a name and a valid annual date before saving.
          </p>
        ) : null}

        {SECTIONS.map((section) => (
          <fieldset key={section}>
            <legend>{SECTION_META[section].label}</legend>
            <SectionFields section={section} value={content} onChange={setContent} />
          </fieldset>
        ))}

        <div className="field">
          <label htmlFor="entry-note">Your note (optional)</label>
          <input
            type="text"
            id="entry-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="A reminder to yourself. Never shown as part of the office."
          />
        </div>

        {empty ? <p className="small muted">Add some text to at least one section before saving.</p> : null}
      </div>
    </Dialog>
  )
}
