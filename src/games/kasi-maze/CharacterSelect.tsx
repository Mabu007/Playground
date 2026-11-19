import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, Check, Play, Zap } from 'lucide-react'
import { inputRouter } from '../../console/inputSingleton'
import { CharacterPortrait } from './CharacterPortrait'
import { KASI_CHARACTERS, getKasiCharacter, loadKasiCharacter, rememberKasiCharacter, type KasiCharacterId } from './characters'
import { disposeKasiAudio, getKasiAudio } from './audio'
import type { GameEntryProps } from '../../engine/games/types'

export default function CharacterSelect({ onStart, onExit, sound }: GameEntryProps) {
  const [id, setId] = useState<KasiCharacterId>(loadKasiCharacter)
  const chosen = getKasiCharacter(id)
  const confirmed = useRef(false)
  const current = useRef(id)
  current.current = id
  const pick = (next: KasiCharacterId) => {
    current.current = next
    setId(next)
    const audio = getKasiAudio(sound)
    audio.unlock()
    audio.mode('menu')
    audio.effect('navigate')
  }
  const confirm = () => {
    if (confirmed.current) return
    confirmed.current = true
    rememberKasiCharacter(current.current)
    const audio = getKasiAudio(sound)
    audio.unlock()
    audio.effect('confirm')
    audio.mode('game')
    onStart(current.current)
  }
  const leave = () => { disposeKasiAudio(); onExit() }
  useEffect(() => { getKasiAudio(sound).configure(sound) }, [sound.volume, sound.muted, sound.musicVolume])
  useEffect(() => {
    const unsubscribe = inputRouter.subscribe(event => {
      if (event.playerId !== 'player-1' || event.phase !== 'pressed' || event.repeated) return
      if (event.action === 'MOVE_LEFT' || event.action === 'MOVE_RIGHT') {
        const index = KASI_CHARACTERS.findIndex(c => c.id === current.current)
        const next = (index + (event.action === 'MOVE_LEFT' ? 3 : 1)) % KASI_CHARACTERS.length
        pick(KASI_CHARACTERS[next].id)
      } else if (event.action === 'CONFIRM' || event.action === 'PRIMARY_ACTION') confirm()
      else if (event.action === 'BACK') leave()
    })
    return () => { unsubscribe(); if (!confirmed.current) disposeKasiAudio() }
    // We only subscribe once; pick/confirm read the current selection by ref.
  }, [])
  return (
    <section className="kasi-select" aria-label="Kasi Maze character selection" data-testid="kasi-character-select">
      <div className="kasi-select-glow" aria-hidden="true"/>
      <div className="kasi-select-title">
        <span className="kasi-eyebrow"><span/> YOUR STORY STARTS HERE</span>
        <h1>WHO'S RUNNING<br/><em>THE STREETS?</em></h1>
        <p>Four originals. One maze. Choose your main character.</p>
      </div>
      <div className="kasi-character-grid" role="group" aria-label="Choose a character">
        {KASI_CHARACTERS.map((character, index) => <button
          key={character.id} type="button"
          className={`kasi-character-card ${id === character.id ? 'selected' : ''}`}
          data-testid={`character-${character.id}`}
          aria-pressed={id === character.id}
          onClick={() => pick(character.id)}
          style={{ '--character-color': character.color } as CSSProperties}
        >
          <div className="kasi-character-portrait"><CharacterPortrait id={character.id}/>
            <span className="kasi-character-number">0{index + 1}</span>
            {id === character.id && <span className="kasi-character-tick"><Check size={16}/></span>}
          </div>
          <div className="kasi-character-info"><strong>{character.name}</strong><span>{character.title}</span>
            <small><Zap size={12}/> {character.ability}</small></div>
        </button>)}
      </div>
      <div className="kasi-select-bottom">
        <div className="kasi-selected-trait"><span>YOU PICKED</span><strong style={{ color: chosen.color }}>{chosen.name}</strong><p>{chosen.tagline} · {chosen.detail}</p></div>
        <div className="kasi-select-actions">
          <button className="kasi-back-btn" type="button" data-native-keys onClick={leave}><ArrowLeft size={17}/> BACK</button>
          <button className="kasi-start-btn" type="button" data-native-keys onClick={confirm} data-testid="start-kasi"><Play size={19} fill="currentColor"/> LET'S GO <ArrowRight size={18}/></button>
        </div>
      </div>
      <p className="kasi-select-help">← → TO CHOOSE <span>·</span> ENTER TO START <span>·</span> ESC TO EXIT</p>
    </section>
  )
}
