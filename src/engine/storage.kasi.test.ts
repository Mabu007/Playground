import {describe,it,expect} from 'vitest'
import {defaultData,withPlay,withSession} from './storage'
describe('Kasi Maze run history',()=>{
  it('tracks per-character best scores without altering overall best',()=>{
    let data=withPlay(defaultData(),'kasi-maze')
    data=withSession(data,{id:'1',gameId:'kasi-maze',score:900,elapsedMs:30000,endedAt:1,reason:'game-over',
      stats:{characterId:'zee',district:2,beatsCollected:80,rivalsTagged:1}})
    data=withSession(data,{id:'2',gameId:'kasi-maze',score:650,elapsedMs:28000,endedAt:2,reason:'exit',
      stats:{characterId:'sbu',district:1,beatsCollected:40,rivalsTagged:0}})
    expect(data.progress.bestScores['kasi-maze']).toBe(900)
    expect(data.progress.bestByCharacter['kasi-maze:zee']).toBe(900)
    expect(data.progress.bestByCharacter['kasi-maze:sbu']).toBe(650)
    expect(data.progress.sessions[0].stats?.characterId).toBe('sbu')
  })
  it('persists the music volume preference independently of master volume',()=>{
    const data=defaultData()
    expect(data.settings.musicVolume).toBeGreaterThan(0)
    expect(data.settings.volume).toBeGreaterThan(0)
  })
})
