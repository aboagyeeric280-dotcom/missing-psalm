import { useState } from 'react'
import { todayISO } from '../liturgy/dates'
import { resolveLiturgicalDay } from '../liturgy/calendar'
import {
  EMPTY_CONTENT,
  SECTIONS,
  SECTION_META,
  entryIsEmpty,
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
      season: key.keyType === 'date' ? undefined : key.season,
      psalterWeek: key.keyType === 'psalter' ? key.psalterWeek : undefined,
      weekday: key.keyType === 'psalter' ? key.weekday : undefined,
      weekOfSeason: key.keyType === 'week' ? key.weekOfSeason : undefined,
      date: key.keyType === 'date' ? key.date : undefined,
    }
    saveEntry(next)
    announce(`Entry saved. ${describeKey(next)}.`)
    onClose()
  }

  const empty = entryIsEmpty({ ...entry, ...content })

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
          <button type="button" className="button button--primary" onClick={handleSave} disabled={empty}>
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
