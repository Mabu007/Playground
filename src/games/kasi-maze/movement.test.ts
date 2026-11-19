import { describe, expect, it } from 'vitest'
import { createMaze, chasePhase, lookAhead, routeTowards } from './maze'
import { advanceTrack, pathsMeet, reverseTrack, trackPoint, TurnBuffer, type TrackPosition } from './movement'

describe('Kasi Maze steering and pursuit', () => {
  const maze = createMaze()
  const mover = (): TrackPosition => ({ col: 14, row: 13, progress: 0, direction: null })

  it('reverses without teleporting and spends the remaining distance through a junction', () => {
    const runner = mover()
    advanceTrack(maze, runner, .4, () => 'right')
    const before = trackPoint(runner)
    reverseTrack(runner, 'left')
    expect(trackPoint(runner)).toEqual(before)
    advanceTrack(maze, runner, .9, () => 'down')
    expect(trackPoint(runner)).toEqual({ x: 14, y: 13.5 })
  })

  it('keeps a tap for the first legal corner, keeps older held directions, and clears pending input', () => {
    const turns = new TurnBuffer(.24)
    turns.press('right', 0)
    turns.press('down', .1)
    turns.release('down', .13)
    expect(turns.choose(.22, direction => direction === 'right')).toBe('right')
    expect(turns.choose(.34, () => true)).toBe('down')
    expect(turns.choose(.35, () => true)).toBe('right')
    turns.clear()
    expect(turns.choose(.36, () => true)).toBeNull()
  })

  it('blocks wall crossings and produces the same track position across frame sizes', () => {
    const first = mover(), split = mover()
    advanceTrack(maze, first, 12, () => 'right')
    for (let i = 0; i < 60; i++) advanceTrack(maze, split, .2, () => 'right')
    expect(trackPoint(first)).toEqual({ x: 21, y: 13 })
    expect(trackPoint(split)).toEqual(trackPoint(first))
  })

  it('detects a head-on crossover while keeping adjacent lanes safe', () => {
    expect(pathsMeet({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 })).toBe(true)
    expect(pathsMeet({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 })).toBe(false)
  })

  it('anticipates along legal lanes and retreats from the player on a powered street', () => {
    expect(lookAhead(maze, { x: 19, y: 13 }, 'right', 4)).toEqual({ x: 21, y: 13 })
    expect(routeTowards(maze, { x: 14, y: 13 }, { x: 18, y: 13 })).toBe('right')
    expect(routeTowards(maze, { x: 14, y: 13 }, { x: 18, y: 13 }, undefined, true)).not.toBe('right')
    expect(chasePhase(4, 1)).toBe('scatter')
    expect(chasePhase(4, 4)).toBe('chase')
    expect(chasePhase(14, 1)).toBe('scatter')
  })
})
