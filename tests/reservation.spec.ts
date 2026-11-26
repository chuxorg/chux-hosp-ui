import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, profile = 'deskAgent') {
  await page.goto('/')
  await page.getByLabel('Sample staff profile').selectOption(profile)
  await page.getByRole('button', { name: 'Enter workspace' }).click()
}

async function pinnedAvailability(page: Page) {
  await page
    .getByRole('region', { name: 'Quick access' })
    .getByRole('link', {
      name: 'iCove Suites · Availability',
    })
    .click()
}

test('a desk agent confirms, reopens by reference, and deliberately cancels a two-night stay', async ({
  page,
}) => {
  await signIn(page)
  await pinnedAvailability(page)
  await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeFocused()
  const cells = page.getByRole('row', { name: /Standard King/ }).getByRole('cell')
  await page.getByLabel('Check-out').fill('2026-11-27')
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await expect(page.getByRole('heading', { name: 'Review reservation' })).toBeFocused()
  await expect(page.getByText('THB 3,700.00')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm sample reservation' }).click()
  await expect(page.getByRole('status')).toContainText('Sample reservation confirmed')
  await expect(cells.nth(0)).toHaveText('7')
  await expect(cells.nth(1)).toHaveText('2')
  await expect(cells.nth(2)).toHaveText('1')
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Platform overview' })
    .click()
  await pinnedAvailability(page)
  await page.getByRole('button', { name: 'Find by reference' }).click()
  await page.getByLabel('Reservation reference').fill('wp-icove-001')
  await page.getByRole('button', { name: 'Find by reference' }).click()
  await expect(page.getByText('WP-ICOVE-001', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click()
  await page.getByRole('button', { name: 'Keep reservation' }).click()
  await expect(cells.nth(0)).toHaveText('7')
  await page.getByRole('button', { name: 'Cancel reservation', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm cancellation' }).click()
  await expect(page.getByRole('status')).toContainText('Sample reservation cancelled')
  await expect(cells.nth(0)).toHaveText('8')
  await expect(cells.nth(1)).toHaveText('3')
  await expect(page.getByRole('button', { name: 'Cancel reservation', exact: true })).toHaveCount(0)
})

test('sold-out and late-conflict recovery preserve dates and offer an available room type', async ({
  page,
}) => {
  await signIn(page)
  await pinnedAvailability(page)
  await page.getByLabel('Check-in').fill('2026-11-28')
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await expect(page.getByRole('alert')).toContainText('after check-in')
  await page.getByLabel('Check-out').fill('2026-11-29')
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await expect(page.getByRole('alert')).toContainText('sold out on at least one night')
  await page.getByRole('button', { name: 'Try another room type · Deluxe Twin' }).click()
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await page.getByText('Preview a last-room conflict', { exact: true }).click()
  await page.getByRole('button', { name: 'Simulate another agent taking the last room' }).click()
  await page.getByRole('button', { name: 'Confirm sample reservation' }).click()
  await expect(page.getByRole('alert')).toContainText('last room sold while you were reviewing')
  await expect(page.getByLabel('Check-in')).toHaveValue('2026-11-28')
  await expect(page.getByLabel('Check-out')).toHaveValue('2026-11-29')
  await page.getByLabel('Check-in').fill('2026-11-25')
  await page.getByLabel('Check-out').fill('2026-11-26')
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await expect(page.getByRole('button', { name: 'Confirm sample reservation' })).toBeVisible()
})

test('a desk agent cannot deep link or look up another property’s reservation', async ({ page }) => {
  await signIn(page, 'manager')
  await page.evaluate(() => {
    location.hash = '#/pms/river/availability'
  })
  await page.getByRole('button', { name: 'Review reservation' }).click()
  await page.getByRole('button', { name: 'Confirm sample reservation' }).click()
  await expect(page.getByText('WP-RIVER-001', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out of preview' }).click()
  await page.getByLabel('Sample staff profile').selectOption('deskAgent')
  await page.getByRole('button', { name: 'Enter workspace' }).click()
  await page.evaluate(() => {
    location.hash = '#/pms/river/availability'
  })
  await expect(page.getByRole('heading', { name: 'This view is unavailable' })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'PMS portfolio' }).click()
  await expect(page.getByRole('heading', { name: 'PMS portfolio' })).toBeVisible()
  await page.getByRole('link', { name: 'iCove Suites · Availability' }).click()
  await page.getByRole('button', { name: 'Find by reference' }).click()
  await page.getByLabel('Reservation reference').fill('WP-RIVER-001')
  await page.getByRole('button', { name: 'Find by reference' }).click()
  await expect(page.getByRole('alert')).toContainText('No sample reservation matches')
  await expect(page.getByRole('heading', { name: 'Reservation details' })).toHaveCount(0)
})

test('the reservation path fits the Thai dark-mode layout at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await signIn(page)
  await pinnedAvailability(page)
  await page.getByLabel('Language').selectOption('th')
  await page.getByLabel('รูปแบบการแสดงผล').selectOption('dark')
  await page.getByRole('button', { name: 'ตรวจสอบการจอง' }).click()
  await expect(page.getByRole('heading', { name: 'ตรวจสอบการจอง' })).toBeFocused()
  await page.getByRole('button', { name: 'ยืนยันการจองตัวอย่าง' }).click()
  await expect(page.getByRole('heading', { name: 'รายละเอียดการจอง' })).toBeVisible()
  await page.getByRole('button', { name: 'ยกเลิกการจอง', exact: true }).click()
  await page.getByRole('button', { name: 'ยืนยันการยกเลิก' }).click()
  await expect(page.getByRole('status')).toContainText('ยกเลิกการจองตัวอย่างแล้ว')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
})
