import { expect, test, type Page } from '@playwright/test'

const MONDAY_OT_1 = '2026-01-12'
const MONDAY_OT_5 = '2026-02-09'

async function setDate(page: Page, value: string) {
  await page.getByLabel('Date').fill(value)
}

async function addReading(page: Page, text: string, reference = 'Romans 13:11') {
  await page.getByRole('button', { name: /Add the short reading/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Short reading').fill(text)
  await dialog.getByLabel('Scripture reference').fill(reference)
  await dialog.getByRole('button', { name: /Save short reading/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('core workflows', () => {
  test('resolves the day, stores a section and repeats it four weeks later', async ({ page }) => {
    await page.goto('/')
    await setDate(page, MONDAY_OT_1)
    await expect(page.getByText('Monday of the First Week in Ordinary Time')).toBeVisible()

    await addReading(page, 'It is now the hour for us to rise from sleep.')
    await expect(page.getByText('It is now the hour for us to rise from sleep.')).toBeVisible()
    await expect(page.getByText('Psalter I')).toBeVisible()

    await setDate(page, MONDAY_OT_5)
    await expect(page.getByText('Monday of the Fifth Week in Ordinary Time')).toBeVisible()
    await expect(page.getByText('It is now the hour for us to rise from sleep.')).toBeVisible()
  })

  test('survives a reload, which is what local storage is for', async ({ page }) => {
    await page.goto('/')
    await setDate(page, MONDAY_OT_1)
    await addReading(page, 'Stored across reloads.')

    await page.reload()
    await setDate(page, MONDAY_OT_1)
    await expect(page.getByText('Stored across reloads.')).toBeVisible()
  })

  test('stores a memorial as an annual celebration', async ({ page }) => {
    await page.goto('/')
    await setDate(page, '2026-10-01')
    await page.getByRole('button', { name: /Add the responsory/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Responsory').fill('Annual memorial responsory.')
    await dialog.getByRole('radio', { name: /This celebration each year/i }).click()
    await dialog.getByLabel('Celebration name').fill('Saint Thérèse of the Child Jesus')
    await dialog.getByRole('button', { name: /Save responsory/i }).click()

    await expect(page.getByText('Annual memorial responsory.')).toBeVisible()
    await expect(page.getByText('Memorial', { exact: true })).toBeVisible()

    await setDate(page, '2027-10-01')
    await expect(page.getByText('Annual memorial responsory.')).toBeVisible()
  })

  test('every screen is reachable and renders', async ({ page }) => {
    await page.goto('/')
    for (const name of ['Library', 'Progress', 'Backup', 'Lookup']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.locator('main')).toBeVisible()
      expect(await page.locator('main').innerText()).not.toBe('')
    }
  })
})

test.describe('self-check 10: a 375px screen', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 400, 'mobile only')

  test('has no sideways scrolling on any screen', async ({ page }) => {
    await page.goto('/')
    await setDate(page, '2026-12-20')
    await addReading(page, 'A reading long enough to test wrapping on a narrow screen. '.repeat(4))

    for (const name of ['Lookup', 'Library', 'Progress', 'Backup']) {
      await page.getByRole('button', { name, exact: true }).click()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${name} overflows horizontally`).toBeLessThanOrEqual(1)
    }
  })

  test('has comfortable touch targets on the main controls', async ({ page }) => {
    await page.goto('/')
    const controls = [
      page.getByRole('button', { name: 'Previous day' }),
      page.getByRole('button', { name: 'Next day' }),
      page.getByRole('button', { name: /^Morning/ }),
      page.getByRole('button', { name: 'Library', exact: true }),
    ]
    for (const control of controls) {
      const box = await control.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(40)
      expect(box!.width).toBeGreaterThanOrEqual(40)
    }
  })

  test('the editor dialog is usable and can be dismissed with the keyboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Add the responsory/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('self-check 9: offline', () => {
  test('keeps working with the network switched off', async ({ page, context }) => {
    await page.goto('/')
    await setDate(page, MONDAY_OT_1)
    await addReading(page, 'Readable with no network.')

    // Wait for the service worker to take control of the page.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 })

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('heading', { name: 'The Missing Parts' })).toBeVisible()
    await setDate(page, MONDAY_OT_1)
    await expect(page.getByText('Readable with no network.')).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()

    await context.setOffline(false)
  })
})
