import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, profile: string) {
  await page.goto('/')
  await page.getByLabel('Sample staff profile').selectOption(profile)
  await page.getByRole('button', { name: 'Enter workspace' }).click()
}

test('sign-in opens the platform, then portfolio and property tools', async ({ page }) => {
  await signIn(page, 'manager')
  await expect(page.getByRole('heading', { name: 'Welcome, Maya' })).toBeFocused()
  await page.getByRole('link', { name: 'Open module · Property management' }).click()
  await expect(page.getByRole('heading', { name: 'PMS portfolio' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Room inventory' })).toContainText('106')
  await expect(page.getByRole('region', { name: 'Room inventory' })).toContainText('76%')
  await page.getByLabel('Inventory scope').selectOption('icove')
  await expect(page.getByRole('region', { name: 'Room inventory' })).toContainText('80%')
  await page.getByRole('link', { name: 'Open property', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'iCove Suites' })).toBeVisible()
  await page.getByRole('link', { name: 'Availability', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeVisible()
  await expect(page.locator('.calendar td').first()).toHaveText('8')
  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page.locator('.calendar td').first()).toHaveText('6')
  await page.goBack()
  await page.getByRole('link', { name: 'Front desk', exact: true }).click()
  await expect(page.getByRole('rowheader', { name: 'DEMO-ICOVE-1042' })).toBeVisible()
})

test('links and deep routes respect tenant, module and property scope', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'waypost.dashboard.v1.deskAgent.coast.platform',
      JSON.stringify({ pins: ['operations', 'pms/river/availability', 'pms/icove/availability'] }),
    )
  })
  await signIn(page, 'deskAgent')
  const quick = page.getByRole('region', { name: 'Quick access' })
  await expect(quick.getByRole('link')).toHaveCount(1)
  await expect(quick.getByRole('link', { name: 'iCove Suites · Availability' })).toBeVisible()
  const modules = page.getByRole('region', { name: 'Your modules' })
  await expect(modules.getByRole('article')).toHaveCount(2)
  await expect(modules.getByRole('link', { name: 'Open module · Operations' })).toHaveCount(0)
  await page.evaluate(() => {
    location.hash = '#/loyalty'
  })
  await expect(page.getByRole('heading', { name: 'This view is unavailable' })).toBeVisible()
  await page.evaluate(() => {
    location.hash = '#/pms/river/availability'
  })
  await expect(page.getByRole('heading', { name: 'This view is unavailable' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out of preview' }).click()
  await page.getByLabel('Sample staff profile').selectOption('host')
  await page.getByRole('button', { name: 'Enter workspace' }).click()
  await expect(modules.getByRole('article')).toHaveCount(1)
  await page.getByRole('link', { name: 'Open module · Experiences' }).click()
  await expect(page.getByRole('heading', { name: 'Experiences', exact: true })).toBeVisible()
})

test('shortcuts and dashboard sections persist by profile, tenant and level', async ({ page }) => {
  await signIn(page, 'manager')
  await page.getByRole('button', { name: 'Pin shortcut · Operations' }).click()
  await expect(
    page.getByRole('region', { name: 'Quick access' }).getByRole('link', { name: 'Operations' }),
  ).toBeVisible()
  await page.getByLabel('Tenant', { exact: true }).selectOption('north')
  await expect(
    page.getByRole('region', { name: 'Your modules' }).getByText('Loyalty', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Quick access' }).getByText('Operations')).toHaveCount(0)
  await page.getByLabel('Tenant', { exact: true }).selectOption('coast')
  await expect(
    page.getByRole('region', { name: 'Quick access' }).getByRole('link', { name: 'Operations' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Open module · Property management' }).click()
  await page.getByRole('button', { name: 'Customize' }).click()
  await page.getByLabel('Inventory KPIs').uncheck()
  await page.getByLabel('Property list').uncheck()
  await page.getByLabel('Inventory scope').selectOption('river')
  await expect(page.getByRole('link', { name: 'Open property', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out of preview' }).click()
  await page.getByRole('button', { name: 'Enter workspace' }).click()
  await page.getByRole('link', { name: 'Open module · Property management' }).click()
  await expect(page.getByRole('region', { name: 'Room inventory' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Customize' }).click()
  await page.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(page.getByRole('region', { name: 'Room inventory' })).toBeVisible()
})

test('Thai dark mode retains access and fits a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 })
  await signIn(page, 'manager')
  await page.getByLabel('Language').selectOption('th')
  await page.getByLabel('รูปแบบการแสดงผล').selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'th')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('link', { name: 'เปิดโมดูล · การจัดการโรงแรม' }).click()
  await expect(page.getByRole('heading', { name: 'ภาพรวมโรงแรมในเครือ' })).toBeVisible()
  await page.getByRole('link', { name: 'iCove Suites', exact: true }).click()
  await page.getByRole('link', { name: 'ห้องว่าง', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'ห้องว่าง', exact: true })).toBeVisible()
  const dimensions = await page.locator('.table-scroll').evaluate((el) => ({
    grid: el.scrollWidth,
    view: el.clientWidth,
    doc: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }))
  expect(dimensions.grid).toBeGreaterThan(dimensions.view)
  expect(dimensions.doc).toBe(dimensions.viewport)
})
