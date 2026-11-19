export type KasiCharacterId = 'sbu' | 'zee' | 'katlego' | 'thami'
export interface KasiCharacter {
  id: KasiCharacterId
  name: string
  title: string
  tagline: string
  ability: string
  detail: string
  color: string
  secondary: string
  rgb: number
  speed: number
  powerBonus: number
  scoreMultiplier: number
  cornerBufferMs: number
}
export const KASI_CHARACTERS: readonly KasiCharacter[] = [
  { id:'sbu',name:'SBU',title:'THE STREET SPRINTER',tagline:'Catch me if you can.',ability:'QUICK FEET',detail:'4% faster on the streets',color:'#B9FF7D',secondary:'#30E9B5',rgb:0xb9ff7d,speed:1.04,powerBonus:0,scoreMultiplier:1,cornerBufferMs:240 },
  { id:'zee',name:'ZEE',title:'THE GAME CHANGER',tagline:'Always two steps ahead.',ability:'POWER PLAYER',detail:'Power boost lasts longer',color:'#FF72B4',secondary:'#FFD57B',rgb:0xff72b4,speed:1,powerBonus:.7,scoreMultiplier:1,cornerBufferMs:240 },
  { id:'katlego',name:'KATLEGO',title:'THE SMOOTH OPERATOR',tagline:'Every corner is mine.',ability:'SMOOTH MOVES',detail:'More forgiving turns',color:'#62E9F1',secondary:'#82A7FF',rgb:0x62e9f1,speed:1,powerBonus:0,scoreMultiplier:1,cornerBufferMs:340 },
  { id:'thami',name:'THAMI',title:'THE BEAT HUNTER',tagline:'The party follows me.',ability:'BEAT BONUS',detail:'+2 points per beat',color:'#FFC174',secondary:'#A4FE86',rgb:0xffc174,speed:1,powerBonus:0,scoreMultiplier:1.2,cornerBufferMs:240 },
] as const
export const getKasiCharacter = (id: string | null | undefined): KasiCharacter =>
  KASI_CHARACTERS.find(character => character.id === id) ?? KASI_CHARACTERS[0]
const KEY = 'playground:kasi:character'
export function loadKasiCharacter(): KasiCharacterId {
  try { return getKasiCharacter(localStorage.getItem(KEY)).id } catch { return 'sbu' }
}
export function rememberKasiCharacter(id: KasiCharacterId) {
  try { localStorage.setItem(KEY,id) } catch { /* optional local persistence */ }
}
