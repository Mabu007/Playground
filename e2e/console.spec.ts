import { test, expect } from '@playwright/test'

test('Kasi Maze is the flagship; upcoming games cannot launch', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('KASI')
  await expect(page.locator('[data-game-card="kasi-maze"]')).toBeVisible()
  await expect(page.locator('[data-game-card="neon-dodge"]')).toBeVisible()
  await expect(page.locator('[data-game-card="taxi-rush"]')).toBeVisible()
  await expect(page.locator('[data-game-card="kasi-fighters"]')).toBeVisible()
  await page.locator('body').click({ position: { x: 3, y: 3 } })
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-game-card="taxi-rush"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /taxi rush game details/i })).toBeVisible()
  await expect(page.getByRole('dialog', { name: /taxi rush/i }).getByRole('button', { name: /PLAY NOW/i })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /taxi rush/i })).toHaveCount(0)
})

test('Kasi Maze launches real Phaser gameplay with scoring, pause, restart and exit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /play now/i }).first().click()
  await expect(page.getByTestId('game-screen')).toBeVisible()
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(1, { timeout: 25_000 })
  // The short ready phase is intentional; movement collects actual map objects.
  await page.waitForTimeout(2500)
  let scored = false
  for (const direction of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await page.keyboard.down(direction)
    await page.waitForTimeout(650)
    await page.keyboard.up(direction)
    if (Number((await page.getByTestId('score').innerText()).replace(/,/g, '')) > 0) { scored = true; break }
  }
  expect(scored).toBe(true)
  await page.keyboard.press('p')
  await expect(page.getByText('TAKE A BREATHER.')).toBeVisible()
  await page.getByRole('button', { name: 'RESUME' }).click()
  await expect(page.getByText('TAKE A BREATHER.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(1)
  await page.getByRole('button', { name: /back to library/i }).first().click()
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('YOUR ARCADE STORY.')).toBeVisible()
  await expect(page.getByText('TOTAL PLAYS')).toBeVisible()
  await expect(page.getByText('KASI MAZE').first()).toBeVisible()
})

test('repeat launch and exit does not leave canvases running', async ({ page }) => {
  await page.goto('/')
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: /play now/i }).first().click()
    await expect(page.locator('.phaser-mount canvas')).toHaveCount(1, { timeout: 25_000 })
    await page.getByRole('button', { name: /back to library/i }).first().click()
    await expect(page.locator('canvas')).toHaveCount(0)
  }
})

test('settings persist and 390px layout avoids horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('dialog', { name: 'Console settings' })).toBeVisible()
  await page.getByRole('switch').click()
  await page.getByRole('combobox', { name: 'Local demo timer' }).selectOption('1')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Open settings' }).click()
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('combobox', { name: 'Local demo timer' })).toHaveValue('1')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Close settings' }).click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(overflow).toBe(false)
})
