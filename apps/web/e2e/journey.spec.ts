import { expect, type Page, test } from '@playwright/test'

/**
 * The mock-mode journey (§11.3): gallery POD → events stream in → open an
 * event → fork → generate an artifact → export JSON. The ledger is
 * virtualized, so totals are asserted against the API and the keyboard walks
 * rows into view.
 */

async function branchViewFromUrl(page: Page) {
  const branchId = page.url().match(/\/b\/([0-9A-Z]+)/)?.[1]
  expect(branchId).toBeTruthy()
  const res = await page.request.get(`http://localhost:8787/api/branches/${branchId}/view`)
  expect(res.ok()).toBe(true)
  return (await res.json()) as {
    events: Array<{ flags: { disputed: boolean; convergence: boolean }; title: string }>
  }
}

async function walkUntilVisible(page: Page, testId: string, maxSteps = 60): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    if (
      await page
        .getByTestId(testId)
        .first()
        .isVisible()
        .catch(() => false)
    )
      return
    await page.keyboard.press('j')
    await page.waitForTimeout(50)
  }
  await expect(page.getByTestId(testId).first()).toBeVisible()
}

test('demo mode is unmissable and the live check answers honestly', async ({ page }) => {
  await page.goto('/')
  // The shell pill and the composer banner both say what the engine is.
  await expect(page.getByTestId('demo-pill')).toBeVisible()
  await expect(page.getByTestId('demo-banner')).toBeVisible()
  await expect(page.getByTestId('demo-banner')).toContainText('canned')
  // The pill walks to Settings, where the mode is stated and checkable.
  await page.getByTestId('demo-pill').click()
  await expect(page).toHaveURL(/\/settings/)
  await expect(page.getByText('demo - canned, deterministic, keyless')).toBeVisible()
  await page.getByRole('button', { name: 'Test live connection' }).click()
  await expect(page.getByText(/demo mode; configure ANTHROPIC_API_KEY/)).toBeVisible()
})

test('the WW2 gate, demo side: the ask lands in 1939-1945 through the card', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('the point of divergence').fill('What if the Allies lost World War 2')
  await page.getByRole('button', { name: 'Read the divergence' }).click()

  // The interpretation card offers the real mechanisms, never a random century.
  await expect(page.getByTestId('interpretation-card')).toBeVisible()
  await expect(page.getByRole('button', { name: /Operation Sea Lion succeeds/ })).toBeVisible()
  const year = Number(await page.getByLabel('year', { exact: true }).inputValue())
  expect(year).toBeGreaterThanOrEqual(1939)
  expect(year).toBeLessThanOrEqual(1945)

  // Pick a mechanism, open the ledger, and let the derivation run.
  await page.getByRole('button', { name: /Moscow falls in the winter/ }).click()
  await page.getByRole('button', { name: 'Open the ledger' }).click()
  await expect(page).toHaveURL(/\/t\/.+\/b\/.+/)
  await expect(page.getByText('the divergence · ')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: /Moscow falls in the winter/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue derivation' })).toBeVisible({
    timeout: 90_000,
  })
})

test('a vanished branch gets the honest dead end, not a retry loop', async ({ page }) => {
  // Ephemeral serverless instances forget chronicles (recycling, redeploys);
  // a 404 must read as the truth with a way out, not "ask again".
  await page.goto('/t/ghost/b/ghost-branch')
  await expect(page.getByText('This chronicle is no longer on the shelf.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Return to the atlas/ })).toBeVisible()
  await page.getByRole('link', { name: /Return to the atlas/ }).click()
  await expect(page.getByText('the point of divergence')).toBeVisible()
})

test('the full journey, keyless', async ({ page }) => {
  await page.goto('/')

  // 1. Choose a divergence from the catalogue.
  await expect(page.getByText('or choose from the catalogue')).toBeVisible()
  await page.getByRole('button', { name: /Constantinople holds/ }).click()

  // 2. Events stream in over SSE until the run completes.
  await expect(page).toHaveURL(/\/t\/.+\/b\/.+/)
  await expect(page.getByText('the divergence · ')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Continue derivation' })).toBeVisible({
    timeout: 90_000,
  })
  const rootView = await branchViewFromUrl(page)
  expect(rootView.events.length).toBeGreaterThanOrEqual(15)
  expect(rootView.events.some((e) => e.flags.disputed)).toBe(true)
  expect(rootView.events.some((e) => e.flags.convergence)).toBe(true)

  // The dual review's marks are walkable into view (j exercises the keyboard map).
  await page.getByTestId('timeline-scroll').click({ position: { x: 5, y: 5 } })
  await walkUntilVisible(page, 'disputed-mark')

  // 2b. The engine room recorded the run's provider calls (v2/M15).
  await page.getByRole('link', { name: 'engine', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The engine room' })).toBeVisible()
  await expect(page.getByText('era-generate', { exact: false }).first()).toBeVisible()
  await page.goBack()

  // 3. Open an event.
  await page.locator('[data-event-id] h3 a').first().click()
  await expect(page.getByText('causes (')).toBeVisible()
  await page.getByRole('button', { name: 'Expand' }).click()
  await expect(page.getByRole('button', { name: 'Expand' })).toBeHidden({ timeout: 20_000 })

  // 4. Generate an artifact and read it.
  await page.getByTestId('generate-letter').click()
  await expect(
    page.getByText('a letter produced from inside this timeline', { exact: false }),
  ).toBeVisible({ timeout: 20_000 })
  await page.goBack()

  // 5. Fork here, with a sub-divergence; the child derives its own history.
  await page.getByRole('button', { name: 'Fork here' }).click()
  await page
    .getByLabel('sub-divergence (optional)')
    .fill('What if the harbor chain failed the next spring?')
  await page.getByRole('dialog').getByRole('button', { name: 'Fork here' }).click()
  await expect(page.getByRole('button', { name: 'Continue derivation' })).toBeVisible({
    timeout: 90_000,
  })
  const childView = await branchViewFromUrl(page)
  expect(childView.events.some((e) => e.title === 'The second divergence lands')).toBe(true)
  // The ledger search collapses the virtualized spine to the sub-divergence.
  await page.getByRole('searchbox').fill('second divergence')
  await expect(page.getByText('The second divergence lands')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('searchbox').clear()

  // The delta view shows both branches.
  await page.getByRole('link', { name: 'delta', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The delta' })).toBeVisible()
  await expect(page.getByText('sub-divergence', { exact: true })).toBeVisible()

  // 6. Export JSON.
  await page.goBack()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'export', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/uchronia-.*\.json/)
})
