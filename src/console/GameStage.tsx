import { useEffect, useRef } from 'react'
import { ArrowLeft, Maximize2, Pause, Play, RotateCcw, X, Keyboard, Trophy, Timer } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useConsole } from '../engine/core/consoleStore'
import { gameById } from '../engine/games/registry'
import { GameHost } from '../engine/games/GameHost'
import { inputRouter } from './inputSingleton'
import { sessionManager } from '../engine/sessions/SessionManager'
import { playerManager } from '../engine/players/PlayerManager'
import { toggleFullscreen } from '../engine/display/fullscreen'
import { formatTime } from './format'

export function GameStage() {
  const activeId = useConsole(s => s.activeGameId)
  const view = useConsole(s => s.view)
  const score = useConsole(s => s.score)
  const elapsedMs = useConsole(s => s.elapsedMs)
  const error = useConsole(s => s.error)
  const remainingMs = useConsole(s => s.remainingMs)
  const best = useConsole(s => s.data.progress.bestScores[activeId ?? ''] ?? 0)
  const data = useConsole(s => s.data)
  const info = gameById(activeId ?? '')
  const stageRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef(new GameHost())
  const viewRef = useRef(view)
  viewRef.current = view

  const pause = () => {
    const current = useConsole.getState().view
    if (current === 'PLAYING') { hostRef.current.pause(); useConsole.getState().pause() }
    else if (current === 'PAUSED') { hostRef.current.resume(); useConsole.getState().resume() }
  }
  const restart = () => {
    if (!['PLAYING', 'PAUSED', 'SESSION_ENDED'].includes(useConsole.getState().view)) return
    useConsole.getState().restart()
    hostRef.current.restart()
  }
  const exit = () => {
    useConsole.getState().exit()
  }

  useEffect(() => {
    let disposed = false
    const game = gameById(activeId ?? '')
    const parent = stageRef.current
    if (!game || !parent) { useConsole.getState().fail('The selected game could not be loaded.'); return }
    const host = hostRef.current
    const off = inputRouter.subscribe(event => {
      if (event.playerId !== 'player-1' || event.phase !== 'pressed' || event.repeated) return
      if (event.action === 'PAUSE' || event.action === 'BACK') pause()
      if (event.action === 'RESTART') restart()
      if (event.action === 'TOGGLE_FULLSCREEN') void toggleFullscreen()
    })
    void host.launch(game, {
      parent,
      input: inputRouter,
      playerId: 'player-1',
      sound: { volume: data.settings.volume, muted: data.settings.muted },
      emit: event => {
        if (disposed) return
        if (event.type === 'score') useConsole.getState().setScore(event.score)
        if (event.type === 'ended') {
          useConsole.getState().setScore(event.score)
          useConsole.getState().end(event.reason)
        }
      },
    }).then(success => {
      if (disposed) return
      if (!success) throw new Error('The game could not start.')
      sessionManager.prepare(game.id, ['player-1'], useConsole.getState().data.settings.demoMinutes)
      sessionManager.start()
      playerManager.assignSession('player-1', sessionManager.snapshot().id)
      useConsole.getState().started()
    }).catch(error => {
      if (!disposed) useConsole.getState().fail(error instanceof Error ? error.message : 'Unknown game error')
    })
    return () => { disposed = true; off(); host.destroy() }
    // The running game is intentionally mounted once per active ID.
  }, [activeId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (viewRef.current === 'PLAYING' || viewRef.current === 'PAUSED') {
        const snapshot = sessionManager.snapshot()
        useConsole.getState().setClock(snapshot.elapsedMs, snapshot.remainingMs)
        if (sessionManager.isExpired()) {
          hostRef.current.pause()
          useConsole.getState().end('timeout')
        }
      }
    }, 180)
    return () => window.clearInterval(interval)
  }, [])

  const ended = view === 'SESSION_ENDED'
  const paused = view === 'PAUSED'
  const loading = view === 'LOADING'
  useEffect(() => { document.getElementById("game-root")?.focus({ preventScroll: true }) }, [])
  return (
    <div className="game-screen" data-testid="game-screen" id="game-root" tabIndex={-1}>
      <header className="game-topbar">
        <button className="icon-text-button" data-native-keys onClick={exit} aria-label="Exit to library"><ArrowLeft size={18}/> <span>BACK TO LIBRARY</span></button>
        <div className="game-running-title"><span className="live-dot"/> {info?.title ?? 'ARCADE'} <span className="subdued">/ ARCADE MODE</span></div>
        <button className="icon-button" data-native-keys onClick={() => void toggleFullscreen()} title="Toggle fullscreen" aria-label="Toggle fullscreen"><Maximize2 size={18}/></button>
      </header>

      <div className="play-content">
        <div className="score-strip">
          <div className="score-item"><span><Trophy size={15}/> SCORE</span><strong data-testid="score">{score.toLocaleString()}</strong></div>
          <div className="score-item"><span>PERSONAL BEST</span><strong>{Math.max(score, best).toLocaleString()}</strong></div>
          <div className="score-item align-right"><span><Timer size={15}/> {remainingMs !== null ? 'SESSION LEFT' : 'SURVIVAL TIME'}</span><strong>{formatTime(remainingMs ?? elapsedMs)}</strong></div>
        </div>
        <div className="game-viewport-shell">
          <div className="phaser-mount" ref={stageRef} data-testid="phaser-mount" />
          <AnimatePresence>
            {loading && (
              <motion.div className="game-modal-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="loading-orbit"/><span className="eyebrow">INITIALIZING ARENA</span><h2>LIGHTS ON. GAME ON.</h2>
              </motion.div>
            )}
            {view === 'ERROR' && (
              <motion.div className="game-modal-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="eyebrow">COULD NOT LAUNCH GAME</span><h2>SOMETHING WENT WRONG.</h2><p>{error ?? 'Please try again.'}</p>
                <div className="modal-actions"><button className="button-primary" onClick={exit}><ArrowLeft size={18}/> BACK TO LIBRARY</button></div>
              </motion.div>
            )}
            {paused && (
              <motion.div className="game-modal-screen" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <span className="eyebrow">SESSION PAUSED</span><h2>TAKE A BREATHER.</h2><p>You've got this. The arena is right where you left it.</p>
                <div className="modal-actions"><button className="button-primary" data-native-keys onClick={pause}><Play size={19} fill="currentColor"/> RESUME</button><button className="button-quiet" data-native-keys onClick={restart}><RotateCcw size={18}/> RESTART</button><button className="button-quiet" data-native-keys onClick={exit}><X size={18}/> EXIT</button></div>
              </motion.div>
            )}
            {ended && (
              <motion.div className="game-modal-screen" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <span className="eyebrow">{sessionManager.snapshot().endReason === 'timeout' ? 'SESSION COMPLETE' : 'GAME OVER'}</span>
                <h2>THAT WAS A RUN.</h2><div className="final-score">{score.toLocaleString()} <small>PTS</small></div>
                <p>{score > best ? 'New personal best. You earned that.' : 'Every run is another shot at your best.'}</p>
                <div className="modal-actions"><button className="button-primary" data-native-keys onClick={restart}><RotateCcw size={18}/> TRY AGAIN</button><button className="button-quiet" data-native-keys onClick={exit}><ArrowLeft size={18}/> ARCADE LIBRARY</button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="game-footer">
          <div className="game-controls-note"><Keyboard size={17}/> {info?.controls.map(control => <span key={control.label}>{control.keys.map(key => <kbd key={key}>{key}</kbd>)} {control.label}</span>)}<span><kbd>P</kbd> PAUSE</span><span><kbd>R</kbd> RESTART</span></div>
          <div className="stage-buttons"><button className="stage-control" data-native-keys onClick={restart} disabled={loading}><RotateCcw size={17}/> Restart</button><button className="stage-control strong" data-native-keys onClick={pause} disabled={loading || ended}>{paused ? <Play size={17}/> : <Pause size={17}/>} {paused ? 'Resume' : 'Pause'}</button></div>
        </div>
        <p className="mobile-game-warning">This game requires a connected keyboard to play. Touch gameplay is not available in this version.</p>
      </div>
    </div>
  )
}
