import {describe,it,expect} from 'vitest'
import { KASI_CHARACTERS, getKasiCharacter } from './characters'
describe('Kasi Maze playable characters',()=>{
  it('offers four unique original playable characters',()=>{
    expect(KASI_CHARACTERS.map(c=>c.id)).toEqual(['sbu','zee','katlego','thami'])
    expect(new Set(KASI_CHARACTERS.map(c=>c.name)).size).toBe(4)
    expect(new Set(KASI_CHARACTERS.map(c=>c.color)).size).toBe(4)
  })
  it('keeps balancing modifiers deliberate and small',()=>{
    expect(getKasiCharacter('sbu').speed).toBeCloseTo(1.04)
    expect(getKasiCharacter('zee').powerBonus).toBeCloseTo(.7)
    expect(getKasiCharacter('katlego').cornerBufferMs).toBeGreaterThan(150)
    expect(getKasiCharacter('thami').scoreMultiplier).toBeCloseTo(1.2)
    expect(getKasiCharacter('broken').id).toBe('sbu')
  })
})
