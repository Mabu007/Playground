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
  await expect(page.getByTestId('kasi-character-select')).toBeVisible()
  await page.getByTestId('character-zee').click()
  await expect(page.getByTestId('character-zee')).toHaveAttribute('aria-pressed','true')
  await page.getByTestId('start-kasi').click()
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(1, { timeout: 25_000 })
  // The short ready phase is intentional; movement collects actual map objects.
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeEnabled()
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
  await page.getByRole('button', { name: 'RESUME', exact: true }).click()
  await expect(page.getByText('TAKE A BREATHER.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(1)
  await page.getByRole('button', { name: 'Exit to library' }).click()
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
    await page.getByTestId('start-kasi').click()
    await expect(page.locator('.phaser-mount canvas')).toHaveCount(1, { timeout: 25_000 })
    await page.getByRole('button', { name: 'Exit to library' }).click()
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


test('cinematic hero has seamless header and visible actions at desktop and short laptop heights', async ({ page }) => {
  for (const size of [
    { width: 1366, height: 608 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(size)
    await page.goto('/')
    const play = page.getByTestId('hero-play')
    const info = page.getByRole('button', { name: 'MORE INFO' })
    await expect(play).toBeVisible()
    await expect(play).toBeInViewport({ ratio: 0.95 })
    await expect(info).toBeInViewport({ ratio: 0.95 })
    await expect(page.locator('.hero-badge')).toHaveCount(0)
    await expect(page.locator('.hero-metadata .metadata-tag')).toHaveCount(0)
    expect(await page.locator('.desktop-nav').evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px')
    expect(await page.locator('.main-header').evaluate(el => getComputedStyle(el).position)).toBe('fixed')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true)
  }
})

test('details and settings trap keyboard focus and restore it on close', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: 'MORE INFO' })
  await opener.focus()
  await opener.click()
  const modal = page.getByRole('dialog', { name: /kasi maze game details/i })
  await expect(modal).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(modal.getByRole('button', { name: 'Close game details' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(modal.getByRole('button', { name: /back to library/i })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(opener).toBeFocused()
  await page.getByRole('button', { name: 'Open settings' }).click()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('dialog', { name: 'Console settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Console settings' })).toHaveCount(0)
})

test('mobile navigation is tappable and the featured actions stay in the hero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByTestId('hero-play')).toBeInViewport({ ratio: 0.95 })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Games' }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0)
  await expect(page.locator('[data-game-card="kasi-maze"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true)
})

test('choose four original characters using both keyboard and mouse before the session starts', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('hero-play').click()
  const select = page.getByTestId('kasi-character-select')
  await expect(select).toBeVisible()
  for (const id of ['sbu','zee','katlego','thami']) {
    await expect(page.getByTestId('character-'+id)).toBeVisible()
    await page.getByTestId('character-'+id).click()
    await expect(page.getByTestId('character-'+id)).toHaveAttribute('aria-pressed','true')
  }
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('character-sbu')).toHaveAttribute('aria-pressed','true')
  await page.keyboard.press('Enter')
  await expect(select).toHaveCount(0)
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(1,{timeout:25_000})
  await expect(page.getByTestId('score')).toHaveText('0')
  await page.getByRole('button',{name:'Exit to library'}).click()
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('game selection allows clean escape without starting or counting a paid session',async({page})=>{
  await page.goto('/')
  await page.getByTestId('hero-play').click()
  await expect(page.getByTestId('kasi-character-select')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('game-screen')).toHaveCount(0)
  await expect(page.locator('.phaser-mount canvas')).toHaveCount(0)
  await expect(page.getByText('YOUR ARCADE STORY.')).toBeVisible()
})

test('scrollbars stay invisible without disabling scroll',async({page})=>{
  await page.goto('/')
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(true)
  const before=await page.evaluate(()=>scrollY)
  await page.mouse.wheel(0,900)
  await expect.poll(async()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before)
  const hidden=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement).scrollbarWidth
    const shelf=getComputedStyle(document.querySelector('.shelf-grid')!).scrollbarWidth
    return root==='none'&&shelf==='none'
  })
  expect(hidden).toBe(true)
})

test('game graphics stay visible on mobile and no horizontal scrolling is introduced',async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await page.getByTestId('hero-play').click()
  await expect(page.getByTestId('kasi-character-select')).toBeVisible()
  await expect(page.getByTestId('character-sbu')).toBeVisible()
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)
  expect(overflow).toBe(false)
})
