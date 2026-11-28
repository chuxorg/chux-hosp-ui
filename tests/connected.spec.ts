import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { dashboardCopy } from '../src/dashboard-copy'
import { liveCopy } from '../src/live-copy'
import { messages } from '../src/messages'
import { reservationCopy } from '../src/reservation-copy'

const path = '/#/pms/reservations'
const operator = { id: 7, display_name: 'Synthetic Waypost Operator' }
const csrf = 'fixture-csrf'

async function stubAuth(context: BrowserContext) {
  const auth = { user: null as typeof operator | null, logoutCsrf: undefined as string | undefined }
  await context.route('**/auth/v1/session', async (route) => {
    await route.fulfill(
      auth.user ? { json: { user: auth.user, csrf_token: csrf } } : { status: 401, json: {} },
    )
  })
  await context.route('**/auth/v1/login', async (route) => {
    auth.user = operator
    await route.fulfill({ status: 302, headers: { location: '/auth/v1/session' } })
  })
  await context.route('**/auth/v1/logout', async (route) => {
    auth.logoutCsrf = route.request().headers()['x-csrf-token']
    auth.user = null
    await route.fulfill({ status: 204 })
  })
  return auth
}

function refocus(page: Page) {
  return page.evaluate(() => window.dispatchEvent(new Event('focus')))
}

for (const language of ['en', 'th'] as const) {
  test(`shared landing, connected navigation and sign-out in ${language}`, async ({ page, context }) => {
    const auth = await stubAuth(context)
    const copy = liveCopy[language]
    const dashboard = dashboardCopy[language]
    const labels = reservationCopy[language]
    await page.goto('/')
    await page.getByLabel(messages.en.language).selectOption(language)
    await page.getByLabel(messages[language].theme).selectOption('dark')
    await expect(page.getByRole('heading', { name: dashboard.signIn })).toBeVisible()
    await expect(page.locator('.landing-image')).toBeVisible()
    await expect(page.getByRole('navigation', { name: dashboard.nav })).toHaveCount(0)
    const signIn = page.getByRole('link', { name: copy.signIn })
    await expect(signIn).toHaveAttribute('href', '/auth/v1/login')
    const [popup] = await Promise.all([context.waitForEvent('page'), signIn.click()])
    await popup.waitForURL('**/auth/v1/session')
    await popup.close()

    if (language === 'en') await refocus(page)
    else await page.getByRole('button', { name: copy.sessionCheck }).click()

    await expect(page.getByText(operator.display_name)).toBeVisible()
    const nav = page.getByRole('navigation', { name: dashboard.nav })
    await expect(nav.getByRole('link')).toHaveCount(2)
    await nav.getByRole('link', { name: dashboard.pms }).click()
    await nav.getByRole('link', { name: copy.reservations }).click()
    await expect(page.getByRole('heading', { name: copy.heading })).toBeVisible()
    await expect(page.getByText('Waypost Pilot · Standard King')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByLabel(labels.arrival).fill('2027-01-02')
    await page.getByLabel(labels.departure).fill('2027-01-04')
    await page.getByRole('button', { name: labels.review }).click()
    await expect(page.getByText(copy.estimate)).toBeVisible()
    await expect(page.getByText(/3,700\.00/)).toBeVisible()

    await page.getByRole('button', { name: copy.endSession }).click()
    await expect(page.getByRole('heading', { name: dashboard.signIn })).toBeVisible()
    expect(auth.logoutCsrf).toBe(csrf)
    await expect(page.getByRole('heading', { name: copy.heading })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { name: dashboard.signIn })).toBeVisible()
    await page.goBack()
    await expect(nav).toHaveCount(0)
  })
}

test('signed-out deep links stay on the landing page', async ({ page, context }) => {
  await stubAuth(context)
  await page.goto(path)
  await expect(page.getByRole('heading', { name: dashboardCopy.en.signIn })).toBeVisible()
  await page.getByRole('button', { name: liveCopy.en.sessionCheck }).click()
  await expect(page.getByRole('alert')).toHaveText(liveCopy.en.sessionMissing)
  await expect(page.getByRole('heading', { name: liveCopy.en.heading })).toHaveCount(0)
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('focus revalidation shows expiry and removes the connected shell', async ({ page, context }) => {
  const auth = await stubAuth(context)
  auth.user = operator
  await page.goto(path)
  await expect(page.getByRole('heading', { name: liveCopy.en.heading })).toBeVisible()
  auth.user = null
  await refocus(page)
  await expect(page.getByRole('alert')).toHaveText(liveCopy.en.expired)
  await expect(page.getByRole('heading', { name: dashboardCopy.en.signIn })).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
})

test('an unresolved mutation survives expiry and retries for the original operator only', async ({
  page,
  context,
}) => {
  const auth = await stubAuth(context)
  auth.user = operator
  const submitted: { key: string | undefined; body: string | null }[] = []
  await context.route('**/pms/v1/properties/42/stay-reservations', async (route) => {
    submitted.push({
      key: route.request().headers()['idempotency-key'],
      body: route.request().postData(),
    })
    if (submitted.length === 1) {
      await route.fulfill({ status: 503, json: {} })
    } else if (submitted.length === 2) {
      auth.user = null
      await route.fulfill({ status: 401, json: {} })
    } else {
      await route.fulfill({ status: 409, json: { error: 'inventory_exhausted' } })
    }
  })
  await page.goto(path)
  const labels = reservationCopy.en
  await page.getByLabel(labels.arrival).fill('2027-01-02')
  await page.getByLabel(labels.departure).fill('2027-01-04')
  await page.getByRole('button', { name: labels.review }).click()
  await page.getByRole('button', { name: labels.confirm }).click()
  await expect(page.getByRole('alert')).toHaveText(liveCopy.en.uncertain)
  await page.getByRole('button', { name: liveCopy.en.retry }).click()
  await expect(page.getByRole('alert')).toHaveText(liveCopy.en.expired)

  auth.user = { id: 8, display_name: 'Another operator' }
  await page.getByRole('button', { name: liveCopy.en.sessionCheck }).click()
  await expect(page.getByText(liveCopy.en.otherOperator)).toBeVisible()
  await expect(page.getByRole('button', { name: liveCopy.en.retry })).toHaveCount(0)

  auth.user = operator
  await refocus(page)
  await page.getByRole('button', { name: liveCopy.en.retry }).click()
  await expect(page.getByRole('alert')).toHaveText(liveCopy.en.conflict)
  expect(submitted[0].key).toBeTruthy()
  expect(submitted).toEqual([submitted[0], submitted[0], submitted[0]])
})
