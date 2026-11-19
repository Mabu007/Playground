/** Deterministic, connected maze generation. Phaser-independent for testing and reuse. */
export type Point = { x: number; y: number }
export type Direction = 'left' | 'right' | 'up' | 'down'
export const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right']
export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, left: { x: -1, y: 0 },
  down: { x: 0, y: 1 }, right: { x: 1, y: 0 },
}
export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
}
export const COLUMNS = 27
export const ROWS = 21
export const PLAYER_SPAWN: Point = { x: 13, y: 17 }
export const RIVAL_SPAWNS: Point[] = [
  { x: 13, y: 9 }, { x: 11, y: 9 }, { x: 15, y: 9 }, { x: 13, y: 7 },
]
export interface Maze {
  width: number
  height: number
  walls: boolean[][]
  pellets: Map<string, 'beat' | 'boost'>
  start: Point
  enemies: Point[]
}
export const keyOf = (p: Point) => `${p.x},${p.y}`
export function walkable(maze: Maze, p: Point) {
  return p.x > 0 && p.y > 0 && p.x < maze.width - 1 && p.y < maze.height - 1 &&
    maze.walls[p.y]?.[p.x] === false
}
export function neighbors(maze: Maze, p: Point): Array<{ point: Point; direction: Direction }> {
  return DIRECTIONS.map(direction => ({ direction, point: { x: p.x + DELTA[direction].x, y: p.y + DELTA[direction].y } }))
    .filter(step => walkable(maze, step.point))
}
function makeRandom(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0
    return value / 4294967296
  }
}
/** Braided depth-first maze: loops are opened so enemies can flank the player. */
export function createMaze(level = 1): Maze {
  const rng = makeRandom(0x4B415349 + Math.max(1, level) * 901)
  const walls = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => true))
  const carve = (p: Point) => { walls[p.y][p.x] = false }
  const visited = new Set<string>()
  const first = { x: 1, y: 1 }
  const stack: Point[] = [first]
  visited.add(keyOf(first))
  carve(first)
  while (stack.length) {
    const point = stack[stack.length - 1]
    const possibilities = DIRECTIONS
      .map(direction => ({ x: point.x + DELTA[direction].x * 2, y: point.y + DELTA[direction].y * 2 }))
      .filter(p => p.x > 0 && p.y > 0 && p.x < COLUMNS - 1 && p.y < ROWS - 1 && !visited.has(keyOf(p)))
    if (!possibilities.length) { stack.pop(); continue }
    const next = possibilities[Math.floor(rng() * possibilities.length)]
    visited.add(keyOf(next))
    carve({ x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 })
    carve(next)
    stack.push(next)
  }
  // Open select intermediate walls to make deliberate loops rather than a one-path maze.
  for (let y = 2; y < ROWS - 2; y++) {
    for (let x = 2; x < COLUMNS - 2; x++) {
      if (!walls[y][x] || rng() >= 0.36) continue
      const horizontal = !walls[y][x - 1] && !walls[y][x + 1]
      const vertical = !walls[y - 1][x] && !walls[y + 1][x]
      if (horizontal !== vertical) walls[y][x] = false
    }
  }
  // Four-way junction in the heart of the district.
  for (let y = 8; y <= 10; y++) for (let x = 11; x <= 15; x++) carve({ x, y })
  for (const p of [PLAYER_SPAWN, ...RIVAL_SPAWNS]) carve(p)
  const pellets = new Map<string, 'beat' | 'boost'>()
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLUMNS - 1; x++) {
      if (walls[y][x]) continue
      if ((Math.abs(x - 13) <= 2 && Math.abs(y - 9) <= 1) || (x === PLAYER_SPAWN.x && y === PLAYER_SPAWN.y)) continue
      const boost = (x === 1 || x === COLUMNS - 2) && (y === 1 || y === ROWS - 2)
      pellets.set(`${x},${y}`, boost ? 'boost' : 'beat')
    }
  }
  return { width: COLUMNS, height: ROWS, walls, pellets, start: { ...PLAYER_SPAWN }, enemies: RIVAL_SPAWNS.map(p => ({ ...p })) }
}
/** BFS chase/scatter routing: returns a legal first step, never cuts through walls. */
export function routeTowards(maze: Maze, from: Point, target: Point, avoid?: Direction): Direction | null {
  const legal = neighbors(maze, from)
  if (!legal.length) return null
  const candidates = legal.filter(option => option.direction !== avoid)
  const available = candidates.length ? candidates : legal
  const targets = new Set<string>([keyOf(target)])
  if (!walkable(maze, target)) {
    targets.clear()
    let distance = Infinity
    for (let y = 1; y < maze.height - 1; y++) for (let x = 1; x < maze.width - 1; x++) {
      if (maze.walls[y][x]) continue
      const d = Math.abs(target.x - x) + Math.abs(target.y - y)
      if (d < distance) { targets.clear(); distance = d }
      if (d === distance) targets.add(`${x},${y}`)
    }
  }
  // BFS from each legal first step; a small grid keeps this cheap and deterministic.
  let best: Direction = available[0].direction
  let bestDistance = Infinity
  for (const option of available) {
    const seenDepth = new Map<string, number>([[keyOf(option.point), 0]])
    // Scope a separate depth table per BFS run; route is shortest number of cells.
    const run = () => {
      const queue = [option.point]
      const visited = new Set([keyOf(option.point)])
      let cursor = 0
      while (cursor < queue.length) {
        const point = queue[cursor++]
        const d = seenDepth.get(keyOf(point))!
        if (targets.has(keyOf(point))) return d
        for (const next of neighbors(maze, point)) {
          const k = keyOf(next.point)
          if (visited.has(k)) continue
          visited.add(k)
          seenDepth.set(k, d + 1)
          queue.push(next.point)
        }
      }
      return Infinity
    }
    const d = run()
    if (d < bestDistance) { bestDistance = d; best = option.direction }
  }
  return best
}
