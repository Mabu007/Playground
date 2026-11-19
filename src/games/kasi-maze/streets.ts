import type * as Phaser from 'phaser'
import type { Maze } from './maze'
import type { DistrictTheme } from './themes'

/** Draw the town once per district. Opaque walls and bright curbs outline every legal lane. */
export function paintStreets(art: Phaser.GameObjects.Graphics, maze: Maze, theme: DistrictTheme, left: number, top: number, tile: number) {
  const width = maze.width * tile
  const height = maze.height * tile
  art.fillStyle(0x070812).fillRoundedRect(left - 8, top - 8, width + 16, height + 16, 11)
  art.fillStyle(theme.street).fillRect(left, top, width, height)

  for (let row = 0; row < maze.height; row++) for (let col = 0; col < maze.width; col++) {
    const x = left + col * tile, y = top + row * tile
    const seed = (col * 31 + row * 17 + col * row * 3) % 97
    if (!maze.walls[row][col]) {
      if (seed % 7 === 0) art.lineStyle(1, theme.light, .13).lineBetween(x + 7, y + 29, x + 24, y + 29)
      if (seed % 13 === 0) art.fillStyle(theme.light, .11).fillCircle(x + 11, y + 9, 1.5)
      continue
    }

    art.fillStyle(0x181621).fillRect(x, y, tile, tile)
    art.fillStyle(0x0b101c).fillRoundedRect(x + 3, y + 6, tile - 5, tile - 6, 2)
    const roof = [theme.walls, theme.rooftops, 0x5f3d4d, 0x533945, 0x385062][seed % 5]
    art.fillStyle(roof).fillRoundedRect(x + 2, y + 2, tile - 5, tile - 10, 2)
    art.fillStyle(0xffdec1, .15).fillRect(x + 4, y + 3, tile - 9, 2)
    art.fillStyle(0x100d18, .57).fillRect(x + 4, y + 25, tile - 9, 9)

    if (seed % 7 === 0) {
      // Striped spaza canopy and lit counter.
      art.fillStyle(0x8d5848).fillRect(x + 6, y + 19, 25, 10)
      for (let stripe = 0; stripe < 5; stripe++) {
        art.fillStyle(stripe % 2 ? 0xc25a66 : 0xffcf83).fillRect(x + 6 + 5 * stripe, y + 19, 5, 5)
      }
      art.fillStyle(0xffcb77, .25).fillRect(x + 9, y + 28, 19, 5)
    } else if (seed % 5 === 1) {
      // Angular mural painted on the face of a corner building.
      art.fillStyle(0xc2676e, .86).fillTriangle(x + 5, y + 25, x + 12, y + 10, x + 25, y + 25)
      art.fillStyle(0xf8bd7a, .79).fillTriangle(x + 12, y + 25, x + 27, y + 9, x + 32, y + 25)
      art.lineStyle(2, 0x68bcb1, .75).lineBetween(x + 13, y + 24, x + 27, y + 14)
    } else {
      for (let i = 0; i < 4; i++) {
        const line = x + 7 + i * 6
        art.lineStyle(1, 0xf2c8b4, .14).lineBetween(line, y + 6, line, y + 21)
      }
      if (seed % 3 === 0) art.fillStyle(theme.light, .72).fillRect(x + 9, y + 27, 6, 4).fillRect(x + 21, y + 27, 6, 4)
    }

    art.lineStyle(2, theme.glow, .52)
    if (maze.walls[row - 1]?.[col] === false) art.lineBetween(x + 1, y + 1, x + tile - 1, y + 1)
    if (maze.walls[row + 1]?.[col] === false) art.lineBetween(x + 1, y + tile - 1, x + tile - 1, y + tile - 1)
    if (maze.walls[row][col - 1] === false) art.lineBetween(x + 1, y + 1, x + 1, y + tile - 1)
    if (maze.walls[row][col + 1] === false) art.lineBetween(x + tile - 1, y + 1, x + tile - 1, y + tile - 1)
  }

  const rankX = left + 12 * tile, rankY = top + 7 * tile
  art.fillStyle(0xa46359, .18).fillRoundedRect(rankX + 4, rankY + 5, tile * 5 - 8, tile * 3 - 10, 7)
  art.lineStyle(2, 0xf2c077, .66).strokeRoundedRect(rankX + 6, rankY + 7, tile * 5 - 12, tile * 3 - 14, 6)
  for (let i = 0; i < 7; i++) {
    art.lineStyle(2, 0xf2c077, .36).lineBetween(rankX + 17 + i * 24, rankY + 85, rankX + 27 + i * 24, rankY + 96)
  }
  // Painted taxi silhouettes are part of the plaza surface and never obstruct a route.
  for (const offset of [13, 149]) {
    const x = rankX + offset, y = rankY + 15
    art.fillStyle(0xe9c186, .73).fillRoundedRect(x, y, 31, 15, 4)
    art.fillStyle(0x7c4b62).fillRect(x + 9, y + 3, 14, 9)
    art.fillStyle(0x4a3247).fillRect(x + 4, y + 3, 4, 9).fillRect(x + 24, y + 3, 4, 9)
    art.lineStyle(2, 0x82b694, .8).lineBetween(x + 4, y + 12, x + 27, y + 12)
  }
}
