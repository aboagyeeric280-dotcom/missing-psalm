import { useRef, useState } from 'react'
import { formatLongDate } from '../liturgy/dates'
import { SECTION_META, type SectionId } from '../data/types'
import {
  analyseImport,
  backupFilename,
  buildBackup,
  sectionText,
  type ConflictWinner,
  type ImportMode,
  type ImportPreview,
  type ImportSummary,
} from '../data/backup'
import { STORAGE_KEY } from '../data/storage'
import { SEED_DESCRIPTION } from '../data/seed'
import {
  addExampleEntries,
  commitImport,
  hasExampleEntries,
  markExported,
  removeExampleEntries,
  useAppState,
} from '../state/store'
import { announce } from '../state/announce'
import { ConfirmDialog } from './Dialog'

function preview(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > 220 ? `${trimmed.slice(0, 220)}…` : trimmed || '(nothing stored)'
}

export function BackupScreen() {
  const { file, storageAvailable, corruptBackupKey, migration } = useAppState()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ preview: ImportPreview; filename: string } | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [conflictWinner, setConflictWinner] = useState<ConflictWinner>('existing')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [confirmRemoveExamples, setConfirmRemoveExamples] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)

  const lastExport = file.meta.lastExportAt

  function handleExport() {
    const backup = buildBackup(file)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    markExported()
    announce(`Backup file created with ${file.entries.length} records.`)
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) return
    setSummary(null)
    setReadError(null)
    try {
      const text = await selected.text()
      const result = analyseImport(text, file.entries)
      setPending({ preview: result, filename: selected.name })
      setMode('merge')
      setConflictWinner('existing')
      announce(
        result.ok
          ? `${selected.name} read. ${result.entries.length} records found. Nothing has changed yet.`
          : `${selected.name} could not be used. Your saved material is unchanged.`,
      )
    } catch {
      setReadError('That file could not be read. Nothing has been changed.')
    } finally {
      event.target.value = ''
    }
  }

  function runImport() {
    if (!pending?.preview.ok) return
    const result = commitImport(pending.preview, { mode, conflictWinner })
    setSummary(result)
    setPending(null)
    setConfirmReplace(false)
    announce(
      result.mode === 'replace'
        ? `Replaced everything. ${result.total} records are now stored.`
        : `Merged. ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged.`,
    )
  }

  return (
    <div>
      <h2 className="panel__title">Backup and data</h2>

      {!storageAvailable ? (
        <div className="notice notice--warn">
          <div className="notice__title">This browser is not letting the app save</div>
          <p>
            Private browsing or a blocked-storage setting usually causes this. Anything you type will be lost when
            you close the tab until it is fixed.
          </p>
        </div>
      ) : null}

      {corruptBackupKey ? (
        <div className="notice notice--warn">
          <div className="notice__title">Saved data could not be read</div>
          <p>
            Nothing was deleted. The unreadable text is still in this browser under{' '}
            <code>{corruptBackupKey}</code>, and the original is still under <code>{STORAGE_KEY}</code>. Import a
            backup to carry on.
          </p>
        </div>
      ) : null}

      {migration.prayersSplitToWeek > 0 ? (
        <div className="notice notice--info">
          <div className="notice__title">Older material was brought forward</div>
          <p>
            {migration.prayersSplitToWeek} concluding prayer
            {migration.prayersSplitToWeek === 1 ? ' was' : 's were'} moved into week-of-season records so they
            apply to the right week. Nothing was deleted.
          </p>
        </div>
      ) : null}

      <section className="panel" aria-labelledby="backup-where">
        <h3 id="backup-where" className="panel__title">
          Where your material lives
        </h3>
        <p>
          Everything is saved <strong>in this browser, on this device</strong>. There is no account and no server,
          so nothing you type leaves this device.
        </p>
        <p className="small muted">
          Clearing your browsing data, using private browsing, or switching to another device or browser means this
          material will not be there. Export a backup regularly, and after any long session of typing.
        </p>
      </section>

      <section className="panel" aria-labelledby="backup-export">
        <h3 id="backup-export" className="panel__title">
          Export a backup
        </h3>
        <p className="small">
          A single JSON file with all {file.entries.length} record{file.entries.length === 1 ? '' : 's'}, the schema
          version and today's date. Keep it somewhere you can find again.
        </p>
        <p className="small muted">
          {lastExport
            ? `Last export: ${formatLongDate(lastExport.slice(0, 10))}.`
            : 'You have not exported a backup from this browser yet.'}
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={handleExport}
          disabled={file.entries.length === 0}
        >
          Export backup file
        </button>
        {file.entries.length === 0 ? (
          <p className="small muted" style={{ marginTop: 'var(--space-2)' }}>
            There is nothing to export yet.
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="backup-import">
        <h3 id="backup-import" className="panel__title">
          Import a backup
        </h3>
        <p className="small">
          Choose a file to see what is in it. Nothing changes until you confirm, and if the file cannot be used your
          current material is left exactly as it is.
        </p>
        <input
          type="file"
          accept="application/json,.json"
          ref={fileInputRef}
          onChange={handleFile}
          aria-label="Choose a backup file"
          style={{ padding: 'var(--space-2)' }}
        />

        {readError ? <p className="notice notice--warn">{readError}</p> : null}

        {pending && !pending.preview.ok ? (
          <div className="notice notice--warn" style={{ marginTop: 'var(--space-4)' }}>
            <div className="notice__title">This file cannot be imported</div>
            <ul>
              {pending.preview.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            <p>
              Your saved material has not been changed. You still have {file.entries.length} record
              {file.entries.length === 1 ? '' : 's'}.
            </p>
          </div>
        ) : null}

        {pending?.preview.ok ? (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div className="notice notice--info">
              <div className="notice__title">{pending.filename}</div>
              <p>
                <strong>{pending.preview.entries.length}</strong> records to import.{' '}
                {pending.preview.exportedAt
                  ? `Exported ${formatLongDate(pending.preview.exportedAt.slice(0, 10))}.`
                  : 'No export date recorded in this file.'}{' '}
                {pending.preview.schemaVersion ? `Schema version ${pending.preview.schemaVersion}.` : ''}
              </p>
              <ul>
                <li>{pending.preview.newRecords} new record(s)</li>
                <li>{pending.preview.enrichedRecords} would add sections to a record you already have</li>
                <li>{pending.preview.unchangedRecords} identical to what you have</li>
                <li>{pending.preview.conflicts.length} conflict(s) with different wording</li>
              </ul>
            </div>

            {pending.preview.warnings.length > 0 ? (
              <div className="notice">
                <div className="notice__title">Worth knowing</div>
                <ul>
                  {pending.preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {pending.preview.conflicts.length > 0 ? (
              <section aria-labelledby="import-conflicts">
                <h4 id="import-conflicts" className="panel__title">
                  Conflicts
                </h4>
                {pending.preview.conflicts.slice(0, 10).map((conflict) => (
                  <div className="conflict" key={conflict.key}>
                    <strong>{conflict.description}</strong>
                    <p className="tiny muted">
                      Different wording in: {conflict.sections.map((s) => SECTION_META[s].label).join(', ')}
                    </p>
                    {conflict.sections.map((section: SectionId) => (
                      <div className="compare" key={section}>
                        <div className="compare__side">
                          <div className="compare__label">Yours now</div>
                          <div className="compare__text">{preview(sectionText(conflict.existing, section))}</div>
                        </div>
                        <div className="compare__side">
                          <div className="compare__label">In the file</div>
                          <div className="compare__text">{preview(sectionText(conflict.incoming, section))}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {pending.preview.conflicts.length > 10 ? (
                  <p className="small muted">
                    and {pending.preview.conflicts.length - 10} more conflict(s) not shown.
                  </p>
                ) : null}

                <fieldset>
                  <legend>When wording differs</legend>
                  <label className="choice">
                    <span className="choice__row">
                      <input
                        type="radio"
                        name="conflict-winner"
                        checked={conflictWinner === 'existing'}
                        onChange={() => setConflictWinner('existing')}
                      />
                      <span>
                        <span className="choice__label">Keep what I have</span>
                        <span className="choice__explain">
                          Your current wording stays. New material in the file is still added.
                        </span>
                      </span>
                    </span>
                  </label>
                  <label className="choice">
                    <span className="choice__row">
                      <input
                        type="radio"
                        name="conflict-winner"
                        checked={conflictWinner === 'imported'}
                        onChange={() => setConflictWinner('imported')}
                      />
                      <span>
                        <span className="choice__label">Take the wording from the file</span>
                        <span className="choice__explain">
                          The {pending.preview.conflicts.length} conflicting section(s) are replaced.
                        </span>
                      </span>
                    </span>
                  </label>
                </fieldset>
              </section>
            ) : null}

            <fieldset>
              <legend>How should this be imported?</legend>
              <label className="choice">
                <span className="choice__row">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                  />
                  <span>
                    <span className="choice__label">Merge with what I have</span>
                    <span className="choice__explain">
                      Keeps all {file.entries.length} of your current records and adds what is missing.
                    </span>
                  </span>
                </span>
              </label>
              <label className="choice">
                <span className="choice__row">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  <span>
                    <span className="choice__label">Replace everything</span>
                    <span className="choice__explain">
                      Removes your {file.entries.length} current record(s) and keeps only what is in the file.
                    </span>
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="row">
              <button
                type="button"
                className="button button--primary"
                onClick={() => (mode === 'replace' ? setConfirmReplace(true) : runImport())}
              >
                {mode === 'replace' ? 'Replace everything…' : 'Merge into my material'}
              </button>
              <button type="button" className="button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div className="notice notice--ok" style={{ marginTop: 'var(--space-4)' }} role="status">
            <div className="notice__title">Import finished</div>
            <ul>
              {summary.mode === 'replace' ? (
                <li>{summary.removed} record(s) replaced</li>
              ) : (
                <>
                  <li>{summary.added} record(s) added</li>
                  <li>{summary.updated} record(s) updated</li>
                  <li>{summary.unchanged} record(s) left as they were</li>
                </>
              )}
              {summary.conflicts > 0 ? (
                <li>
                  {summary.conflicts} conflict(s) resolved by{' '}
                  {summary.conflictWinner === 'existing' ? 'keeping your wording' : 'taking the file’s wording'}
                </li>
              ) : null}
              <li>{summary.total} record(s) stored now</li>
            </ul>
            <p className="small">Export a fresh backup so this device and your file agree.</p>
          </div>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="backup-example">
        <h3 id="backup-example" className="panel__title">
          Example material
        </h3>
        <p className="small">{SEED_DESCRIPTION}</p>
        <div className="row">
          <button
            type="button"
            className="button"
            onClick={() => {
              const added = addExampleEntries()
              announce(added > 0 ? `${added} example records added.` : 'The example records are already here.')
            }}
          >
            Add example entries
          </button>
          {hasExampleEntries() ? (
            <button type="button" className="button button--danger" onClick={() => setConfirmRemoveExamples(true)}>
              Remove example entries
            </button>
          ) : null}
        </div>
      </section>

      {confirmReplace && pending?.preview.ok ? (
        <ConfirmDialog
          title="Replace everything you have stored?"
          body={
            <>
              <p>
                This removes <strong>all {file.entries.length} of your current records</strong> and keeps only the{' '}
                {pending.preview.entries.length} in {pending.filename}.
              </p>
              <p>It cannot be undone from inside the app.</p>
              <p className="small muted">
                If you are not certain, cancel and export a backup of what you have first, or choose Merge instead.
              </p>
            </>
          }
          confirmLabel="Replace everything"
          destructive
          onConfirm={runImport}
          onCancel={() => setConfirmReplace(false)}
        />
      ) : null}

      {confirmRemoveExamples ? (
        <ConfirmDialog
          title="Remove the example entries?"
          body={<p>This removes only records marked as example material. Anything you typed yourself is kept.</p>}
          confirmLabel="Remove examples"
          destructive
          onConfirm={() => {
            const removed = removeExampleEntries()
            announce(`${removed} example record(s) removed.`)
            setConfirmRemoveExamples(false)
          }}
          onCancel={() => setConfirmRemoveExamples(false)}
        />
      ) : null}
    </div>
  )
}
