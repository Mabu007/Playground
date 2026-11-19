import { expect, test, type Page } from '@playwright/test'

const scoreOf = async (page: Page) => Number((await page.getByTestId('score').innerText()).replaceAll(',', ''))
const boardOf = (page: Page) => page.getByTestId('kasi-board-status')
const hold = async (page: Page, key: string, ms: number) => {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
}

async function play(page: Page, character: string) {
  await page.getByTestId('hero-play').click()
  await page.getByTestId('character-' + character).click()
  await page.getByTestId('start-kasi').click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled({ timeout: 25_000 })
}

test('all runners collect Gold Rush, reverse, pause and restart without another canvas', async ({ page }) => {
  test.setTimeout(55_000)
  await page.goto('/')
  for (const name of ['sbu', 'zee', 'katlego', 'thami']) {
    await play(page, name)
    await expect(page.locator('.kasi-player-hud strong')).toHaveText(name.toUpperCase())
    await expect(page.locator('canvas')).toHaveCount(1)
    await hold(page, 'ArrowRight', 750)
    await expect.poll(() => scoreOf(page)).toBeGreaterThanOrEqual(105)
    expect(Number(await boardOf(page).getAttribute('data-power'))).toBeGreaterThanOrEqual(5)
    await hold(page, 'ArrowLeft', 950)
    await page.keyboard.press('p')
    await expect(page.getByText('TAKE A BREATHER.')).toBeVisible()
    const score = await scoreOf(page)
    const power = await boardOf(page).getAttribute('data-power')
    await page.waitForTimeout(350)
    expect(await scoreOf(page)).toBe(score)
    await expect(boardOf(page)).toHaveAttribute('data-power', power!)
    await page.keyboard.press('r')
    await expect(page.getByTestId('score')).toHaveText('0')
    await expect(boardOf(page)).toHaveAttribute('data-lives', '3')
    await expect(page.locator('canvas')).toHaveCount(1)
    await page.getByRole('button', { name: 'Exit to library' }).click()
    await expect(page.locator('canvas')).toHaveCount(0)
  }
})

test('rivals take three lives, results preserve score, and character change starts a clean run', async ({ page }) => {
  test.setTimeout(50_000)
  await page.goto('/')
  await play(page, 'zee')
  await hold(page, 'ArrowLeft', 1200)
  const score = await scoreOf(page)
  expect(score).toBeGreaterThan(0)
  await expect(boardOf(page)).toHaveAttribute('data-lives', /^[12]$/, { timeout: 18_000 })
  await expect(page.getByRole('button', { name: 'PLAY AGAIN', exact: true })).toBeVisible({ timeout: 23_000 })
  await expect(boardOf(page)).toHaveAttribute('data-lives', '0')
  expect(await scoreOf(page)).toBe(score)
  await page.getByRole('button', { name: 'CHANGE CHARACTER' }).click()
  await expect(page.locator('canvas')).toHaveCount(0)
  await page.getByTestId('character-thami').click()
  await page.getByTestId('start-kasi').click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeEnabled()
  await expect(page.getByTestId('score')).toHaveText('0')
  await expect(page.locator('.score-item').filter({ hasText: 'BEST' }).locator('strong')).toHaveText(String(score))
})

test('game board and controls remain visible at all four viewport sizes', async ({ page }) => {
  await page.goto('/')
  await play(page, 'katlego')
  const board = page.getByLabel('Kasi Maze playfield')
  for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await expect(board).toBeInViewport({ ratio: .98 })
    await expect(page.getByTestId('score')).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Exit to library' })).toBeInViewport()
    await expect.poll(async () => {
      const box = await board.boundingBox()
      return box ? Math.abs(box.x + box.width / 2 - width / 2) : width
    }).toBeLessThan(3)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await expect(page.getByRole('button', { name: 'Move right' })).toBeInViewport()
  await page.getByRole('button', { name: 'Move right' }).click()
  await expect.poll(() => scoreOf(page)).toBeGreaterThan(0)
})

test('real Web Audio output responds to mute and focus and closes on exit', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext
    const outputs: { context: AudioContext; analyser: AnalyserNode }[] = []
    Object.assign(window, { kasiAudioProbe: outputs })
    window.AudioContext = class extends NativeAudio {
      createDynamicsCompressor() {
        const compressor = super.createDynamicsCompressor()
        const analyser = super.createAnalyser()
        const connect = compressor.connect.bind(compressor)
        compressor.connect = ((destination: AudioNode) => {
          connect(analyser)
          analyser.connect(destination)
          return destination
        }) as typeof compressor.connect
        outputs.push({ context: this, analyser })
        return compressor
      }
    }
  })
  const signal = () => page.evaluate(() => {
    const [output] = (window as Window & {
      kasiAudioProbe?: { context: AudioContext; analyser: AnalyserNode }[]
    }).kasiAudioProbe ?? []
    if (!output) return 0
    const samples = new Float32Array(output.analyser.fftSize)
    output.analyser.getFloatTimeDomainData(samples)
    return Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length)
  })
  await page.goto('/')
  await play(page, 'sbu')
  await expect.poll(signal).toBeGreaterThan(.001)
  await page.getByRole('button', { name: 'Mute game audio' }).click()
  await expect.poll(signal).toBeLessThan(.0001)
  await page.getByRole('button', { name: 'Unmute game audio' }).click()
  await expect.poll(signal).toBeGreaterThan(.001)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(page.getByText('TAKE A BREATHER.')).toBeVisible()
  await expect.poll(signal).toBeLessThan(.0001)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.getByRole('button', { name: 'RESUME', exact: true }).click()
  await expect.poll(signal).toBeGreaterThan(.001)
  await page.getByRole('button', { name: 'Exit to library' }).click()
  await expect.poll(() => page.evaluate(() => {
    return (window as Window & { kasiAudioProbe?: { context: AudioContext }[] }).kasiAudioProbe?.map(item => item.context.state)
  })).toEqual(['closed'])
})
