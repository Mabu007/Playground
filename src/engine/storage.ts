import type { GameRunStats } from './games/types'
export interface Settings {
  volume: number
  musicVolume: number
  muted: boolean
  reducedMotion: boolean
  demoMinutes: number | null
}
export interface SessionRecord {
  id: string
  gameId: string
  score: number
  elapsedMs: number
  endedAt: number
  reason: string
  stats?: GameRunStats
}
export interface Progress {
  totalPlays: number
  recent: string[]
  bestScores: Record<string,number>
  bestByCharacter: Record<string,number>
  sessions: SessionRecord[]
}
export interface LocalData { version: 1; settings: Settings; progress: Progress }
export const DEFAULT_SETTINGS: Settings = { volume:.55,musicVolume:.75,muted:false,reducedMotion:false,demoMinutes:null }
const KEY='playground:v1'
export function defaultData():LocalData{
  return {version:1,settings:{...DEFAULT_SETTINGS},progress:{totalPlays:0,recent:[],bestScores:{},bestByCharacter:{},sessions:[]}}
}
const storage=():Storage|null=>{
  try{return typeof localStorage==='undefined'?null:localStorage}catch{return null}
}
const scores=(obj:unknown):Record<string,number>=>{
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return {}
  return Object.fromEntries(Object.entries(obj).filter((item):item is [string,number]=>
    typeof item[1]==='number'&&Number.isFinite(item[1])&&item[1]>=0))
}
const normalized=(value:unknown,otherwise:number)=>{
  return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):otherwise
}
export function loadData():LocalData {
  const fallback=defaultData()
  try{
    const raw=storage()?.getItem(KEY)
    if(!raw)return fallback
    const data:unknown=JSON.parse(raw)
    if(typeof data!=='object'||data===null||!('version' in data)||data.version!==1)return fallback
    const candidate=data as Partial<LocalData>
    const settings=candidate.settings,progress=candidate.progress
    return {
      version:1,
      settings:{
        volume:normalized(settings?.volume,fallback.settings.volume),
        musicVolume:normalized(settings?.musicVolume,fallback.settings.musicVolume),
        muted:typeof settings?.muted==='boolean'?settings.muted:false,
        reducedMotion:typeof settings?.reducedMotion==='boolean'?settings.reducedMotion:false,
        demoMinutes:settings?.demoMinutes===null||[1,3,5].includes(settings?.demoMinutes??-1)?settings?.demoMinutes??null:null,
      },
      progress:{
        totalPlays:typeof progress?.totalPlays==='number'&&Number.isFinite(progress.totalPlays)&&progress.totalPlays>=0?progress.totalPlays:0,
        recent:Array.isArray(progress?.recent)?progress.recent.filter((id):id is string=>typeof id==='string').slice(0,6):[],
        bestScores:scores(progress?.bestScores),
        bestByCharacter:scores(progress?.bestByCharacter),
        sessions:Array.isArray(progress?.sessions)?progress.sessions.filter((s):s is SessionRecord=>
          !!s&&typeof s==='object'&&typeof s.id==='string'&&typeof s.gameId==='string'&&typeof s.score==='number'&&typeof s.elapsedMs==='number'&&typeof s.endedAt==='number'&&typeof s.reason==='string'
        ).slice(0,40):[],
      },
    }
  }catch{return fallback}
}
export function saveData(data:LocalData){
  try{storage()?.setItem(KEY,JSON.stringify(data))}catch{/* Storage disabled or full. Gameplay remains playable. */}
}
export function withPlay(data:LocalData,gameId:string):LocalData{
  return {...data,progress:{...data.progress,totalPlays:data.progress.totalPlays+1,recent:[gameId,...data.progress.recent.filter(id=>id!==gameId)].slice(0,6)}}
}
export function withSession(data:LocalData,session:SessionRecord):LocalData {
  const characterKey=session.gameId==='kasi-maze'&&session.stats?.characterId?`${session.gameId}:${session.stats.characterId}`:null
  return {...data,progress:{
    ...data.progress,
    bestScores:{...data.progress.bestScores,[session.gameId]:Math.max(data.progress.bestScores[session.gameId]??0,Math.floor(session.score))},
    bestByCharacter:characterKey?{...data.progress.bestByCharacter,[characterKey]:Math.max(data.progress.bestByCharacter[characterKey]??0,Math.floor(session.score))}:data.progress.bestByCharacter,
    sessions:[session,...data.progress.sessions].slice(0,40),
  }}
}
