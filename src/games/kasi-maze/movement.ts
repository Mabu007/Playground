import { DELTA, OPPOSITE, walkable, type Direction, type Maze, type Point } from './maze'

export interface TrackPosition {
  col: number
  row: number
  direction: Direction | null
  progress: number
}

export const STEP_SECONDS = 1 / 60

export function trackPoint(mover: TrackPosition): Point {
  const delta = mover.direction ? DELTA[mover.direction] : { x: 0, y: 0 }
  return { x: mover.col + delta.x * mover.progress, y: mover.row + delta.y * mover.progress }
}

export function reverseTrack(mover: TrackPosition, direction: Direction) {
  if (mover.direction !== OPPOSITE[direction] || mover.progress === 0) return
  const delta = DELTA[mover.direction]
  mover.col += delta.x
  mover.row += delta.y
  mover.progress = 1 - mover.progress
  mover.direction = direction
}

/** Spend the whole movement budget across junctions. A turn only commits at a lane center. */
export function advanceTrack(
  maze: Maze, mover: TrackPosition, distance: number, choose: () => Direction | null,
  onArrival?: () => boolean,
) {
  while (distance > 1e-8) {
    if (mover.progress === 0) {
      const direction = choose()
      const delta = direction && DELTA[direction]
      if (!delta || !walkable(maze, { x: mover.col + delta.x, y: mover.row + delta.y })) {
        mover.direction = null
        return
      }
      mover.direction = direction
    }
    const direction = mover.direction!
    const remaining = 1 - mover.progress
    if (distance < remaining - 1e-8) {
      mover.progress += distance
      return
    }
    distance -= remaining
    mover.col += DELTA[direction].x
    mover.row += DELTA[direction].y
    mover.progress = 0
    if (onArrival?.()) return
  }
}

/** Test closest approach during the same simulation step, including head-on passes. */
export function pathsMeet(a: Point, b: Point, c: Point, d: Point, radius = .53) {
  const x = a.x - c.x, y = a.y - c.y
  const dx = b.x - d.x - x, dy = b.y - d.y - y
  const speedSquared = dx * dx + dy * dy
  const t = speedSquared ? Math.max(0, Math.min(1, -(x * dx + y * dy) / speedSquared)) : 0
  return (x + t * dx) ** 2 + (y + t * dy) ** 2 <= radius ** 2
}

export class TurnBuffer {
  private held = new Set<Direction>()
  private queued: { direction: Direction; until: number } | null = null

  constructor(private readonly seconds: number) {}

  press(direction: Direction, time: number) {
    this.held.delete(direction)
    this.held.add(direction)
    this.queued = { direction, until: time + this.seconds }
  }

  release(direction: Direction, time: number) {
    this.held.delete(direction)
    if (this.queued?.direction === direction) this.queued.until = time + this.seconds
  }

  choose(time: number, available: (direction: Direction) => boolean) {
    if (this.queued && (this.queued.until >= time || this.held.has(this.queued.direction)) && available(this.queued.direction)) {
      const { direction } = this.queued
      this.queued = null
      return direction
    }
    for (const direction of [...this.held].reverse()) if (available(direction)) return direction
    return null
  }

  clear() {
    this.held.clear()
    this.queued = null
  }
}
