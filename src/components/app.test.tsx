import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { STORAGE_KEY } from '../data/storage'
import { reloadFromStorage } from '../state/store'

const MONDAY_OT_1 = '2026-01-12'
const MONDAY_OT_5 = '2026-02-09'

function setDate(value: string) {
  const input = screen.getByLabelText('Date') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

function dialog() {
  return within(screen.getByRole('dialog'))
}

async function typeReading(user: ReturnType<typeof userEvent.setup>, text: string, reference: string) {
  await user.type(dialog().getByLabelText('Short reading'), text)
  await user.type(dialog().getByLabelText('Scripture reference'), reference)
}

beforeEach(() => {
  window.localStorage.clear()
  window.location.hash = ''
  reloadFromStorage()
})

describe('the lookup screen', () => {
  it('shows the resolved liturgical day for a date', async () => {
    render(<App />)
    setDate(MONDAY_OT_1)

    expect(await screen.findByText('Monday of the First Week in Ordinary Time')).toBeInTheDocument()
    expect(screen.getByText('Ordinary Time')).toBeInTheDocument()
    expect(screen.getByText('Week I')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
  })

  it('offers a clear empty state for every missing section', () => {
    render(<App />)
    expect(screen.getAllByText('Not yet added — tap to add it')).toHaveLength(4)
  })

  it('moves a day at a time and back to today', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)

    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-01-13')

    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe(MONDAY_OT_1)

    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('Showing today')).toBeInTheDocument()
  })
})

describe('adding and overriding sections through the interface', () => {
  it('saves a psalter reading and shows it again four weeks later', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)

    await user.click(screen.getAllByRole('button', { name: /^Add the /i })[0])
    await typeReading(user, 'Psalter reading text.', 'Romans 13:11')
    await user.click(screen.getByRole('button', { name: /save short reading/i }))

    expect(await screen.findByText('Psalter reading text.')).toBeInTheDocument()
    expect(screen.getByText('Psalter I')).toBeInTheDocument()
    expect(screen.getByText(/repeats every four weeks/)).toBeInTheDocument()

    setDate(MONDAY_OT_5)
    expect(await screen.findByText('Monday of the Fifth Week in Ordinary Time')).toBeInTheDocument()
    expect(screen.getByText('Psalter reading text.')).toBeInTheDocument()
  })

  it('lets an exact date override one section while the psalter survives', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)

    await user.click(screen.getAllByRole('button', { name: /^Add the /i })[0])
    await typeReading(user, 'Psalter reading text.', 'Romans 13:11')
    await user.click(screen.getByRole('button', { name: /save short reading/i }))
    await screen.findByText('Psalter reading text.')

    setDate(MONDAY_OT_5)
    await screen.findByText('Psalter reading text.')

    // Override just this date.
    await user.click(screen.getByRole('button', { name: /edit the short reading/i }))
    await user.clear(dialog().getByLabelText('Short reading'))
    await user.type(dialog().getByLabelText('Short reading'), 'Only for 9 February.')
    await user.click(dialog().getByRole('radio', { name: /this date only/i }))
    await user.click(screen.getByRole('button', { name: /save short reading/i }))

    expect(await screen.findByText('Only for 9 February.')).toBeInTheDocument()
    expect(screen.getByText('Exact date')).toBeInTheDocument()
    expect(screen.getByText(/Overrides/)).toBeInTheDocument()

    // The psalter entry is untouched and still appears on its other days.
    setDate(MONDAY_OT_1)
    expect(await screen.findByText('Psalter reading text.')).toBeInTheDocument()
    expect(screen.queryByText('Only for 9 February.')).not.toBeInTheDocument()
  })

  it('keeps the four sections independent', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)

    await user.click(screen.getAllByRole('button', { name: /^Add the /i })[0])
    await typeReading(user, 'A reading.', 'Rom 13')
    await user.click(screen.getByRole('button', { name: /save short reading/i }))
    await screen.findByText('A reading.')

    await user.click(screen.getAllByRole('button', { name: /^Add the /i })[0])
    await user.type(dialog().getByLabelText('Responsory'), 'A responsory.')
    await user.click(screen.getByRole('button', { name: /save responsory/i }))

    expect(await screen.findByText('A responsory.')).toBeInTheDocument()
    expect(screen.getByText('A reading.')).toBeInTheDocument()
    expect(screen.getAllByText('Not yet added — tap to add it')).toHaveLength(2)
  })

  it('defaults the concluding prayer to the week of the season', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)

    await user.click(screen.getByRole('button', { name: /Add the concluding prayer/i }))
    expect(dialog().getByRole('radio', { name: /this week of the season/i })).toBeChecked()
    expect(dialog().getByText(/applies only to the 1st week in Ordinary Time/)).toBeInTheDocument()
  })

  it('writes to the original storage key', async () => {
    const user = userEvent.setup()
    render(<App />)
    setDate(MONDAY_OT_1)
    await user.click(screen.getAllByRole('button', { name: /^Add the /i })[0])
    await typeReading(user, 'Stored text.', 'Rom 13')
    await user.click(screen.getByRole('button', { name: /save short reading/i }))

    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toContain('Stored text.')
    expect(JSON.parse(raw!).schemaVersion).toBe(2)
  })
})

describe('the library', () => {
  it('lists stored records and can filter them', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        meta: { createdAt: '2026-01-01T00:00:00.000Z' },
        entries: [
          {
            id: 'one',
            keyType: 'psalter',
            hour: 'morning',
            season: 'ordinary',
            psalterWeek: 1,
            weekday: 1,
            reference: 'Romans 13:11',
            readingText: 'Rise from sleep.',
            translation: 'Douay-Rheims',
            responsory: '',
            intercessions: '',
            concludingPrayer: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'two',
            keyType: 'date',
            hour: 'evening',
            date: '2026-12-20',
            reference: '',
            readingText: '',
            translation: '',
            responsory: 'Come, Lord.',
            intercessions: '',
            concludingPrayer: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    )
    reloadFromStorage()

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Library' }))

    expect(await screen.findByText(/Showing 2 of 2 records/)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Search words or Scripture reference/), 'Romans 13')
    expect(await screen.findByText(/Showing 1 of 2 records/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await user.selectOptions(screen.getByLabelText('Key type'), 'date')
    expect(await screen.findByText(/Showing 1 of 2 records/)).toBeInTheDocument()
    expect(screen.getByText('20 December 2026 · Evening')).toBeInTheDocument()
  })

  it('asks for confirmation before deleting', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'one',
          keyType: 'psalter',
          hour: 'morning',
          season: 'ordinary',
          psalterWeek: 1,
          weekday: 1,
          readingText: 'Rise from sleep.',
        },
      ]),
    )
    reloadFromStorage()

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Library' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Delete this entry?')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText(/Showing 1 of 1 record/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete permanently' }))
    expect(await screen.findByText(/Showing 0 of 0 records/)).toBeInTheDocument()
  })
})
