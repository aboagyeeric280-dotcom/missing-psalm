/**
 * Runs both test suites and reports the ten required self-checks by name.
 *
 * Each check is claimed by test titles containing "self-check N:". The runner
 * refuses to report a check as passing if no test claimed it.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHECKS = [
  'A psalter entry for Ordinary Time, Psalter Week I, Monday, Morning appears again on Monday of the Fifth Week',
  'A concluding prayer for the Eighth Week in Ordinary Time does not appear in the Twelfth Week',
  'An exact-date entry overrides the psalter for that date, and the psalter entry still works elsewhere',
  'All four sections resolve independently',
  'Existing local data survives an application upgrade',
  'Export followed by import restores the same data',
  'An invalid import does not modify existing data',
  'Merge import preserves non-conflicting entries and reports conflicts',
  'The app remains usable offline after its first successful load',
  'Core workflows work on a 375-pixel-wide mobile screen',
]

const work = mkdtempSync(join(tmpdir(), 'missing-parts-selfcheck-'))
const results = new Map() // check number -> { passed, failed }

function claim(title, ok) {
  const match = /self-check (\d+)/i.exec(title)
  if (!match) return
  const number = Number(match[1])
  const entry = results.get(number) ?? { passed: 0, failed: 0 }
  entry[ok ? 'passed' : 'failed'] += 1
  results.set(number, entry)
}

function run(command, args) {
  try {
    execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    return true
  } catch {
    return false
  }
}

// --- unit and component tests -------------------------------------------------
const vitestOut = join(work, 'vitest.json')
const vitestOk = run('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${vitestOut}`])
const vitest = JSON.parse(readFileSync(vitestOut, 'utf8'))
for (const file of vitest.testResults ?? []) {
  for (const test of file.assertionResults ?? []) {
    claim(`${(test.ancestorTitles ?? []).join(' ')} ${test.title}`, test.status === 'passed')
  }
}

// --- browser tests ------------------------------------------------------------
let playwrightOk = true
let playwright = { suites: [] }
try {
  playwright = JSON.parse(
    execFileSync('npx', ['playwright', 'test', '--reporter=json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  )
} catch (error) {
  // Playwright exits non-zero when a test fails, but still prints its report.
  playwrightOk = false
  try {
    playwright = JSON.parse(String(error.stdout ?? '{}'))
  } catch {
    playwright = { suites: [] }
  }
}

function walk(suite, trail = []) {
  const here = [...trail, suite.title].filter(Boolean)
  for (const spec of suite.specs ?? []) {
    const ok = (spec.tests ?? []).every((test) =>
      (test.results ?? []).every((result) => result.status === 'passed' || result.status === 'skipped'),
    )
    const ran = (spec.tests ?? []).some((test) =>
      (test.results ?? []).some((result) => result.status !== 'skipped'),
    )
    if (ran) claim([...here, spec.title].join(' '), ok)
  }
  for (const child of suite.suites ?? []) walk(child, here)
}
for (const suite of playwright.suites ?? []) walk(suite)

// --- report -------------------------------------------------------------------
let allGood = true
console.log('\nRequired self-checks\n')
CHECKS.forEach((description, index) => {
  const number = index + 1
  const entry = results.get(number)
  let status
  if (!entry) {
    status = 'NOT COVERED'
    allGood = false
  } else if (entry.failed > 0) {
    status = `FAILED (${entry.failed} of ${entry.passed + entry.failed})`
    allGood = false
  } else {
    status = `passed (${entry.passed} test${entry.passed === 1 ? '' : 's'})`
  }
  console.log(`${String(number).padStart(2)}. ${description}\n    ${status}\n`)
})

console.log(`Unit and component suite: ${vitestOk ? 'green' : 'RED'}`)
console.log(`Browser suite: ${playwrightOk ? 'green' : 'RED'}`)
rmSync(work, { recursive: true, force: true })

if (!allGood || !vitestOk || !playwrightOk) process.exit(1)
console.log('\nAll ten self-checks pass.')
