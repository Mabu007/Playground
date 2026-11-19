import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Maximize2, Pause, Play, RotateCcw, X, Keyboard, Trophy, Timer, UserRound, Volume2, VolumeX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useConsole } from '../engine/core/consoleStore'
import { gameById } from '../engine/games/registry'
import type { GameEntryProps, GameEvent } from '../engine/games/types'
import { GameHost } from '../engine/games/GameHost'
import { inputRouter } from './inputSingleton'
import type { PlayerAction } from '../engine/input/InputRouter'
import { sessionManager } from '../engine/sessions/SessionManager'
import { playerManager } from '../engine/players/PlayerManager'
import { toggleFullscreen } from '../engine/display/fullscreen'
import { useDialogFocus } from './useDialogFocus'
import { formatTime } from './format'
import { CharacterPortrait } from '../games/kasi-maze/CharacterPortrait'
import { getKasiCharacter } from '../games/kasi-maze/characters'
import { getKasiAudio, disposeKasiAudio } from '../games/kasi-maze/audio'
import '../games/kasi-maze/kasi.css'

export function GameStage() {
  const activeId=useConsole(s=>s.activeGameId)
  const view=useConsole(s=>s.view)
  const score=useConsole(s=>s.score)
  const elapsedMs=useConsole(s=>s.elapsedMs)
  const remainingMs=useConsole(s=>s.remainingMs)
  const error=useConsole(s=>s.error)
  const characterId=useConsole(s=>s.characterId)
  const stats=useConsole(s=>s.runStats)
  const best=useConsole(s=>s.data.progress.bestScores[activeId??'']??0)
  const data=useConsole(s=>s.data)
  const info=gameById(activeId??'')
  const hasEntry=!!info?.entry
  const selecting=hasEntry&&characterId===null
  const [entryScreen,setEntryScreen]=useState<ComponentType<GameEntryProps>|null>(null)
  const [ready,setReady]=useState(false)
  const [board,setBoard]=useState<Extract<GameEvent,{type:'board-status'}>|null>(null)
  const stageRef=useRef<HTMLDivElement>(null)
  const gameDialog=useRef<HTMLDivElement>(null)
  const hostRef=useRef(new GameHost())
  const bestAtRunStart=useRef(best)
  const viewRef=useRef(view)
  viewRef.current=view

  const exit=()=>{useConsole.getState().exit()}
  const pause=()=>{
    const current=useConsole.getState().view
    if(current==='PLAYING'){hostRef.current.pause();useConsole.getState().pause()}
    else if(current==='PAUSED'){hostRef.current.resume();useConsole.getState().resume()}
  }
  const restart=()=>{
    const current=useConsole.getState()
    if(!['PLAYING','PAUSED','SESSION_ENDED'].includes(current.view))return
    if(info?.entry)current.prepareRestart()
    else current.restart()
    bestAtRunStart.current=useConsole.getState().data.progress.bestScores[activeId??'']??0
    hostRef.current.restart()
  }
  const changeCharacter=()=>{
    if(!info?.entry||useConsole.getState().view!=='SESSION_ENDED')return
    hostRef.current.destroy()
    useConsole.getState().chooseAgain()
    setReady(false)
  }
  useEffect(()=>{
    let cancelled=false
    setEntryScreen(null)
    if(info?.entry){
      // Warm the shared Phaser chunk while the player chooses a runner.
      void info.load?.().catch(()=>{})
      void info.entry().then(module=>{
        if(!cancelled)setEntryScreen(()=>module.default)
      }).catch(err=>{
        if(!cancelled)useConsole.getState().fail(err instanceof Error?err.message:'Could not load character selection')
      })
    }
    return ()=>{cancelled=true}
  },[info?.entry])

  useEffect(()=>{
    if(selecting)return
    let disposed=false
    const game=gameById(activeId??'')
    const parent=stageRef.current
    if(!game||!parent){useConsole.getState().fail('The selected game could not be loaded.');return}
    setReady(false)
    setBoard(null)
    const host=hostRef.current
    const off=inputRouter.subscribe(event=>{
      if(event.playerId!=='player-1'||event.phase!=='pressed'||event.repeated)return
      if((event.action==='BACK'||event.action==='PAUSE')&&useConsole.getState().view==='LOADING'){
        if(event.action==='BACK')exit()
        return
      }
      if(event.action==='PAUSE'||event.action==='BACK')pause()
      if(event.action==='RESTART')restart()
      if(event.action==='TOGGLE_FULLSCREEN')void toggleFullscreen()
    })
    const startSession=()=>{
      if(disposed||useConsole.getState().view!=='LOADING')return
      sessionManager.prepare(game.id,['player-1'],useConsole.getState().data.settings.demoMinutes)
      sessionManager.start()
      playerManager.assignSession('player-1',sessionManager.snapshot().id)
      useConsole.getState().started()
    }
    void host.launch(game,{
      parent,input:inputRouter,playerId:'player-1',
      sound:{volume:data.settings.volume,muted:data.settings.muted,musicVolume:data.settings.musicVolume},
      characterId:characterId??undefined,reducedMotion:data.settings.reducedMotion,
      emit:event=>{
        if(disposed)return
        if(event.type==='ready')setReady(true)
        if(event.type==='board-status')setBoard(event)
        if(event.type==='playing')startSession()
        if(event.type==='score')useConsole.getState().setScore(event.score)
        if(event.type==='stats')useConsole.getState().setRunStats(event.stats)
        if(event.type==='ended'){
          if(event.stats)useConsole.getState().setRunStats(event.stats)
          useConsole.getState().setScore(event.score)
          const state=useConsole.getState()
          state.end(event.reason)
          const snap=sessionManager.snapshot()
          state.setClock(snap.elapsedMs,snap.remainingMs)
        }
      },
    }).then(success=>{
      if(disposed)return
      if(!success)throw new Error('The game could not start.')
      // Older modules start immediately; games with their own entry/countdown
      // emit the "playing" event at the exact gameplay start time.
      if(!game.entry)startSession()
    }).catch(err=>{
      if(!disposed)useConsole.getState().fail(err instanceof Error?err.message:'Unknown game error')
    })
    return ()=>{disposed=true;off();host.destroy()}
    // Mount only when the actual game and character selection change, not on score updates.
  },[activeId,characterId,selecting])

  useEffect(()=>{
    const interval=window.setInterval(()=>{
      if(viewRef.current==='PLAYING'||viewRef.current==='PAUSED'){
        const snap=sessionManager.snapshot()
        useConsole.getState().setClock(snap.elapsedMs,snap.remainingMs)
        if(sessionManager.isExpired()){
          hostRef.current.pause()
          useConsole.getState().end('timeout')
        }
      }
    },180)
    return ()=>clearInterval(interval)
  },[])

  useEffect(()=>{
    if(activeId!=='kasi-maze'||!characterId)return
    getKasiAudio(useConsole.getState().data.settings)
  },[activeId,characterId,data.settings.volume,data.settings.musicVolume,data.settings.muted])
  useEffect(()=>{
    let countdownSuspended=false
    const releaseFocus=()=>{
      const state=useConsole.getState()
      if(state.view==='PLAYING'){
        hostRef.current.pause()
        state.pause()
      }else if(state.view==='LOADING'&&hostRef.current.isActive){
        // Don't let an unfinished countdown become an unattended live run.
        hostRef.current.pause()
        countdownSuspended=true
      }
    }
    const restoreCountdown=()=>{
      if(document.visibilityState==='visible'&&countdownSuspended&&useConsole.getState().view==='LOADING'){
        countdownSuspended=false
        hostRef.current.resume()
      }
    }
    const onVisibility=()=>{if(document.visibilityState==='hidden')releaseFocus();else restoreCountdown()}
    window.addEventListener('blur',releaseFocus)
    window.addEventListener('focus',restoreCountdown)
    document.addEventListener('visibilitychange',onVisibility)
    return ()=>{
      window.removeEventListener('blur',releaseFocus)
      window.removeEventListener('focus',restoreCountdown)
      document.removeEventListener('visibilitychange',onVisibility)
    }
  },[])
  useEffect(()=>{
    return ()=>{
      // Also catches exits during the asynchronous Phaser import, before a host exists.
      if(activeId==='kasi-maze')disposeKasiAudio()
    }
  },[activeId])
  useEffect(()=>{document.getElementById('game-root')?.focus({preventScroll:true})},[])
  const ended=view==='SESSION_ENDED'
  const won=ended&&sessionManager.snapshot().endReason==='completed'
  const paused=view==='PAUSED'
  useDialogFocus(gameDialog,paused?pause:exit,paused||ended)
  const loading=view==='LOADING'&&!ready&&!selecting
  const isKasi=activeId==='kasi-maze'
  const character=getKasiCharacter(characterId)
  return <div className={`game-screen ${isKasi?'kasi-game-active':''} ${selecting?'kasi-selecting':''}`} data-testid="game-screen" id="game-root" tabIndex={-1}>
    <header className="game-topbar">
      <button className="icon-text-button" data-native-keys onClick={exit} aria-label="Exit to library"><ArrowLeft size={18}/> <span>{isKasi?'PLAYGROUND':'BACK TO PLAYGROUND'}</span></button>
      {isKasi&&<span className="kasi-brand">KASI <em>MAZE</em></span>}
      <div className="game-running-title"><span className="live-dot"/> {info?.title??'ARCADE'} <span className="subdued">/ ARCADE MODE</span></div>
      <div className="kasi-top-actions">
        {isKasi&&<button className="icon-button" data-native-keys onClick={()=>useConsole.getState().updateSettings({muted:!data.settings.muted})}
          aria-label={data.settings.muted?'Unmute game audio':'Mute game audio'} title={data.settings.muted?'Unmute':'Mute'}>{data.settings.muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>}
        <button className="icon-button" data-native-keys onClick={()=>void toggleFullscreen()} title="Toggle fullscreen" aria-label="Toggle fullscreen"><Maximize2 size={18}/></button>
      </div>
    </header>
    <div className="play-content">
      {!selecting&&<div className="score-strip">
        {isKasi&&<div className="kasi-player-hud">
          <span className="kasi-hud-portrait"><CharacterPortrait id={character.id}/></span>
          <span><strong>{character.name}</strong></span>
        </div>}
        <div className="score-item"><span><Trophy size={15}/> SCORE</span><strong data-testid="score">{score.toLocaleString()}</strong></div>
        <div className="score-item"><span>{isKasi?'BEST':'PERSONAL BEST'}</span><strong>{Math.max(score,best).toLocaleString()}</strong></div>
        <div className="score-item align-right"><span><Timer size={15}/> {remainingMs!==null?'SESSION LEFT':isKasi?'TIME':'SURVIVAL TIME'}</span><strong>{formatTime(remainingMs??elapsedMs)}</strong></div>
      </div>}
      {isKasi&&!selecting&&board&&<div className="kasi-board-status" data-testid="kasi-board-status"
        data-district={board.district} data-lives={board.lives} data-beats={board.remaining} data-power={board.powerSeconds}>
        <span>{board.district} · {board.name}</span>
        <span aria-label={board.lives+' lives'}>{'◆ '.repeat(board.lives)}</span>
        <span>{board.powerSeconds>0?'GOLD RUSH '+board.powerSeconds+'s':board.remaining+' LEFT'}</span>
      </div>}
      <div className="game-viewport-shell">
        {selecting ? (entryScreen ? <EntryScreen
          component={entryScreen} sound={data.settings}
          onStart={id=>{bestAtRunStart.current=best;useConsole.getState().setCharacter(id)}}
          onExit={exit}
        /> : <div className="game-modal-screen"><div className="loading-orbit"/><p>PREPARING THE STREET CREW</p></div>) : <div className="phaser-mount" ref={stageRef} data-testid="phaser-mount"/>}
        <AnimatePresence>
          {loading&&<motion.div className="game-modal-screen" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="loading-orbit"/><span className="eyebrow">ENTERING THE DISTRICT</span><h2>THE STREETS ARE CALLING.</h2>
          </motion.div>}
          {view==='ERROR'&&<motion.div className="game-modal-screen" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <span className="eyebrow">COULD NOT LAUNCH GAME</span><h2>SOMETHING WENT WRONG.</h2>
            <p>{error??'Please try again.'}</p><button className="button-primary" onClick={exit}><ArrowLeft size={17}/> BACK TO PLAYGROUND</button>
          </motion.div>}
          {paused&&<motion.div key="paused" ref={gameDialog} role="dialog" aria-modal="true" aria-label="Game paused" tabIndex={-1} className="game-modal-screen" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} exit={{opacity:0}}>
            <span className="eyebrow">PAUSED • {isKasi?character.name:'YOUR RUN'}</span><h2>TAKE A BREATHER.</h2><p>The streets are right where you left them.</p>
            <div className="modal-actions"><button className="button-primary" data-native-keys onClick={pause}><Play size={18} fill="currentColor"/> RESUME</button>
              <button className="button-quiet" data-native-keys onClick={restart}><RotateCcw size={18}/> RESTART</button>
              <button className="button-quiet" data-native-keys onClick={exit}><X size={18}/> EXIT</button></div>
          </motion.div>}
          {ended&&<motion.div key="results" ref={gameDialog} role="dialog" aria-modal="true" aria-label="Run results" tabIndex={-1} className="game-modal-screen kasi-results" initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0}}>
            <span className="eyebrow">{sessionManager.snapshot().endReason==='timeout'?'SESSION COMPLETE':'RUN COMPLETE'}</span>
            {isKasi&&<span className="result-portrait"><CharacterPortrait id={character.id}/></span>}
            <h2>{won?'STREETS CLEARED!':score>bestAtRunStart.current?'NEW PERSONAL BEST!':'RUN OVER'}</h2>
            <div className="final-score">{score.toLocaleString()} <small>PTS</small></div>
            {isKasi&&<div className="kasi-run-recap">
              <span><strong>{stats?.district??1}</strong><small>DISTRICT</small></span>
              <span><strong>{stats?.beatsCollected??0}</strong><small>BEATS</small></span>
              <span><strong>{stats?.rivalsTagged??0}</strong><small>RIVALS TAGGED</small></span>
            </div>}
            <div className="modal-actions"><button className="button-primary" data-native-keys onClick={restart}><RotateCcw size={18}/> PLAY AGAIN</button>
              {isKasi&&<button className="button-quiet" data-native-keys onClick={changeCharacter}><UserRound size={18}/> CHANGE CHARACTER</button>}
              <button className="button-quiet" data-native-keys onClick={exit}><ArrowLeft size={18}/> EXIT</button></div>
          </motion.div>}
        </AnimatePresence>
      </div>
      {!selecting&&<div className="game-footer">
        <div className="game-controls-note"><Keyboard size={16}/>{isKasi?<span>ARROWS / WASD TO MOVE</span>:info?.controls.filter(control=>control.label!=='PAUSE').map(control=><span key={control.label}>{control.keys.map(key=><kbd key={key}>{key}</kbd>)} {control.label}</span>)}<span><kbd>P</kbd> PAUSE</span><span><kbd>R</kbd> RESTART</span></div>
        <div className="stage-buttons"><button className="stage-control" data-native-keys onClick={restart} disabled={view==='LOADING'}><RotateCcw size={17}/> Restart</button>
          <button className="stage-control strong" data-native-keys onClick={pause} disabled={view==='LOADING'||ended}>{paused?<Play size={17}/>:<Pause size={17}/>} {paused?'Resume':'Pause'}</button></div>
      </div>}
      {isKasi&&!selecting?<KasiTouchPad disabled={paused||ended||view==='ERROR'}/>:!isKasi&&
        <p className="mobile-game-warning">This game requires a connected keyboard to play.</p>}
    </div>
  </div>
}
function EntryScreen({component:Component,...props}:GameEntryProps&{component:ComponentType<GameEntryProps>}) {
  return <Component {...props}/>
}

const touchDirections = [
  { action: 'MOVE_UP', label: 'Up', icon: ArrowUp },
  { action: 'MOVE_LEFT', label: 'Left', icon: ArrowLeft },
  { action: 'MOVE_DOWN', label: 'Down', icon: ArrowDown },
  { action: 'MOVE_RIGHT', label: 'Right', icon: ArrowRight },
] as const

function KasiTouchPad({disabled}:{disabled:boolean}) {
  const move=(action:PlayerAction,phase:'pressed'|'released')=>{
    inputRouter.dispatch({playerId:'player-1',action,phase,source:'touch',repeated:false})
  }
  return <div className="kasi-touch-pad" role="group" aria-label="Steer">
    {touchDirections.map(({action,label,icon:Icon})=><button key={action} type="button" aria-label={'Move '+label.toLowerCase()}
      data-direction={label.toLowerCase()} disabled={disabled} data-native-keys
      onPointerDown={event=>{
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        move(action,'pressed')
      }}
      onLostPointerCapture={()=>move(action,'released')}
      onClick={event=>{if(event.detail===0){move(action,'pressed');move(action,'released')}}}>
      <Icon size={22}/>
    </button>)}
  </div>
}
