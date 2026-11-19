import { describe, expect, it } from 'vitest'
import { createMaze, walkable, neighbors, routeTowards, keyOf, DELTA, PLAYER_SPAWN, RIVAL_SPAWNS } from './maze'
import type { Point } from './maze'

function reachAll(seed: number) {
  const maze = createMaze(seed)
  const queue: Point[] = [PLAYER_SPAWN]
  const reachable = new Set([keyOf(PLAYER_SPAWN)])
  for (let at = 0; at < queue.length; at++) {
    for (const next of neighbors(maze, queue[at])) {
      const key = keyOf(next.point)
      if (reachable.has(key)) continue
      reachable.add(key)
      queue.push(next.point)
    }
  }
  return { maze, reachable }
}
describe('Kasi Maze playable maps', () => {
  it('are seeded and reproducible across retries', () => {
    const a = createMaze(2)
    const b = createMaze(2)
    expect(a.walls).toEqual(b.walls)
    expect([...a.pellets]).toEqual([...b.pellets])
    expect(a.pellets.size).toBeGreaterThan(120)
  })
  it('keep every collectible, spawn and pursuer reachable on 12 levels', () => {
    for (let level = 1; level <= 12; level++) {
      const { maze, reachable } = reachAll(level)
      expect(walkable(maze, PLAYER_SPAWN)).toBe(true)
      for (const p of RIVAL_SPAWNS) expect(reachable.has(keyOf(p))).toBe(true)
      for (const p of maze.pellets.keys()) expect(reachable.has(p)).toBe(true)
      expect(reachable.size).toBeGreaterThan(maze.pellets.size)
    }
  })
  it('routes legal first steps around walls', () => {
    const maze = createMaze()
    for (const start of [PLAYER_SPAWN, ...RIVAL_SPAWNS]) {
      const dir = routeTowards(maze, start, { x: 1, y: 1 })
      expect(dir).not.toBeNull()
      if (!dir) continue
      expect(walkable(maze, { x: start.x + DELTA[dir].x, y: start.y + DELTA[dir].y })).toBe(true)
    }
  })
  it('respects no-immediate-reversal when alternatives are present', () => {
    const maze = createMaze(4)
    const junction = { x: 13, y: 9 }
    const options = neighbors(maze, junction)
    expect(options.length).toBeGreaterThan(1)
    const avoided = options[0].direction
    expect(routeTowards(maze, junction, { x: 1, y: 1 }, avoided)).not.toBe(avoided)
  })
})
