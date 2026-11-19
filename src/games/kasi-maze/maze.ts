/** Township street-network maze. Pure deterministic geometry with no Phaser dependency. */
export type Point = { x: number; y: number }
export type Direction = 'left' | 'right' | 'up' | 'down'
export const DIRECTIONS: readonly Direction[] = ['up','left','down','right'] as const
export const DELTA: Record<Direction,Point> = { up:{x:0,y:-1},left:{x:-1,y:0},down:{x:0,y:1},right:{x:1,y:0} }
export const OPPOSITE: Record<Direction,Direction> = { up:'down',down:'up',left:'right',right:'left' }
export const COLUMNS = 29
export const ROWS = 17
export const PLAYER_SPAWN: Point = {x:14,y:13}
export const RIVAL_SPAWNS: Point[] = [{x:14,y:8},{x:13,y:8},{x:15,y:8},{x:14,y:7}]
export type Pickup = 'beat' | 'boost'
export interface Maze {
  width: number
  height: number
  walls: boolean[][]
  pellets: Map<string,Pickup>
  start: Point
  enemies: Point[]
}
export const keyOf = (p: Point) => `${p.x},${p.y}`
export function walkable(maze: Maze,p: Point): boolean {
  return p.x > 0 && p.x < maze.width - 1 && p.y > 0 && p.y < maze.height - 1 && maze.walls[p.y]?.[p.x] === false
}
export function neighbors(maze: Maze,p: Point): {point:Point;direction:Direction}[] {
  return DIRECTIONS.map(direction=>({direction,point:{x:p.x+DELTA[direction].x,y:p.y+DELTA[direction].y}}))
    .filter(option=>walkable(maze,option.point))
}
function rng(seed: number) {
  let value=seed>>>0
  return () => {value=(Math.imul(value,1664525)+1013904223)>>>0;return value / 4294967296}
}
/**
 * District 01 is hand-authored as city-block streets: five east-west avenues and
 * five north-south arteries, with deliberately chosen cut-through lanes.
 * Subsequent districts reuse that connected skeleton and reveal new alleys.
 */
export function createMaze(level=1): Maze {
  const walls=Array.from({length:ROWS},()=>Array.from({length:COLUMNS},()=>true))
  const carve=(x:number,y:number)=>{
    if(x>0&&y>0&&x<COLUMNS-1&&y<ROWS-1) walls[y][x]=false
  }
  const laneH=(y:number,a:number,b:number)=>{for(let x=a;x<=b;x++)carve(x,y)}
  const laneV=(x:number,a:number,b:number)=>{for(let y=a;y<=b;y++)carve(x,y)}
  for(const y of [1,5,8,11,15]) laneH(y,1,27)
  for(const x of [1,7,14,21,27]) laneV(x,1,15)
  // Hand-placed side streets form recognizable turns and escape loops.
  for(const [x,a,b] of [
    [4,1,5],[10,1,5],[18,1,5],[24,1,5],
    [4,11,15],[10,11,15],[18,11,15],[24,11,15],
    [4,6,8],[10,8,11],[18,5,8],[24,8,11],
    [3,8,11],[25,5,8],[12,5,8],[16,8,11],
  ])laneV(x,a,b)
  for(const [y,a,b] of [
    [3,1,7],[3,14,21],[3,21,27],
    [6,7,14],[6,18,27],
    [10,1,7],[10,14,21],
    [13,7,14],[13,14,21],
  ])laneH(y,a,b)
  // The central "rank" is a clean starting plaza for all four rivals.
  for(let y=7;y<=9;y++)for(let x=12;x<=16;x++)carve(x,y)
  const random=rng(0x4B415349+level*4051)
  if(level>1) {
    // Only OPEN extra optional streets; the core connectivity never changes.
    for(let i=0;i<Math.min(12,level*2);i++) {
      const x=2+Math.floor(random()*25)
      const y=2+Math.floor(random()*13)
      const side=walls[y][x-1]===false&&walls[y][x+1]===false
      const top=walls[y-1][x]===false&&walls[y+1][x]===false
      if(side||top)carve(x,y)
    }
  }
  for(const p of [PLAYER_SPAWN,...RIVAL_SPAWNS])carve(p.x,p.y)
  const pellets=new Map<string,Pickup>()
  for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLUMNS-1;x++){
    if(walls[y][x])continue
    if((x>=12&&x<=16&&y>=7&&y<=9)||x===PLAYER_SPAWN.x&&y===PLAYER_SPAWN.y)continue
    const boost=(x===1||x===COLUMNS-2)&&(y===1||y===ROWS-2)
    pellets.set(`${x},${y}`,boost?'boost':'beat')
  }
  return {width:COLUMNS,height:ROWS,walls,pellets,start:{...PLAYER_SPAWN},enemies:RIVAL_SPAWNS.map(p=>({...p}))}
}
/** BFS shortest path with optional reversal avoidance. */
export function routeTowards(maze: Maze,from: Point,target: Point,avoid?:Direction):Direction|null {
  const options=neighbors(maze,from)
  if(!options.length)return null
  const available=options.filter(option=>option.direction!==avoid)
  const candidates=available.length?available:options
  let destination=target
  if(!walkable(maze,destination)){
    let best=Infinity
    for(let y=1;y<maze.height-1;y++)for(let x=1;x<maze.width-1;x++){
      if(maze.walls[y][x])continue
      const distance=Math.abs(target.x-x)+Math.abs(target.y-y)
      if(distance<best){best=distance;destination={x,y}}
    }
  }
  const depths=new Map<string,number>([[keyOf(destination),0]])
  const queue=[destination]
  for(let head=0;head<queue.length;head++){
    const point=queue[head]
    const depth=depths.get(keyOf(point))!
    for(const step of neighbors(maze,point)){
      const key=keyOf(step.point)
      if(depths.has(key))continue
      depths.set(key,depth+1)
      queue.push(step.point)
    }
  }
  let bestOption=candidates[0]
  let bestDistance=Infinity
  for(const option of candidates){
    const d=depths.get(keyOf(option.point))??Infinity
    if(d<bestDistance){bestOption=option;bestDistance=d}
  }
  return bestOption.direction
}
