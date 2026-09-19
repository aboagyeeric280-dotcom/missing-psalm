import { useId } from 'react'
import { SECTION_META, type EntryContent, type SectionId } from '../data/types'

interface SectionFieldsProps {
  section: SectionId
  value: EntryContent
  onChange: (next: EntryContent) => void
  autoFocus?: boolean
}

/**
 * The content fields for one section. Scripture reference, reading text and
 * translation are kept apart on purpose: the app never guesses a translation.
 */
export function SectionFields({ section, value, onChange, autoFocus }: SectionFieldsProps) {
  const ids = useId()
  const meta = SECTION_META[section]

  if (section === 'reading') {
    return (
      <>
        <div className="field">
          <label htmlFor={`${ids}-reference`}>Scripture reference</label>
          <input
            type="text"
            id={`${ids}-reference`}
            value={value.reference}
            placeholder="e.g. Romans 13:11-13"
            onChange={(event) => onChange({ ...value, reference: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={`${ids}-text`}>Short reading</label>
          <textarea
            id={`${ids}-text`}
            value={value.readingText}
            placeholder={meta.placeholder}
            autoFocus={autoFocus}
            onChange={(event) => onChange({ ...value, readingText: event.target.value })}
          />
          <p className="field__hint">
            The text is shown exactly as you type it. Nothing is completed, corrected or reworded.
          </p>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-translation`}>Translation</label>
          <input
            type="text"
            id={`${ids}-translation`}
            value={value.translation}
            placeholder="e.g. Revised Standard Version, Douay-Rheims, Grail"
            onChange={(event) => onChange({ ...value, translation: event.target.value })}
          />
          <p className="field__hint">Shown with the reading so you always know which version you are reading.</p>
        </div>
      </>
    )
  }

  const field = meta.fields[0]
  return (
    <div className="field">
      <label htmlFor={`${ids}-${field}`}>{meta.label}</label>
      <textarea
        id={`${ids}-${field}`}
        value={value[field]}
        placeholder={meta.placeholder}
        autoFocus={autoFocus}
        rows={section === 'intercessions' ? 10 : 7}
        onChange={(event) => onChange({ ...value, [field]: event.target.value })}
      />
      <p className="field__hint">Line breaks are kept exactly as you type them.</p>
    </div>
  )
}
