import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ArrowDownRight, ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, Gamepad2, Headphones, Keyboard, Maximize2, Menu, Play, Settings2, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { useConsole } from '../engine/core/consoleStore'
import { games, gameById } from '../engine/games/registry'
import type { GameInfo } from '../engine/games/types'
import { KeyboardAdapter } from '../engine/input/KeyboardAdapter'
import { inputRouter } from './inputSingleton'
import { toggleFullscreen, isFullscreenSupported } from '../engine/display/fullscreen'
import { Artwork } from './Artwork'
import { GameStage } from './GameStage'
import { useDialogFocus } from './useDialogFocus'

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand" aria-label="Playground"><span className="brand-symbol"><i/><i/><i/><i/></span>{!compact && <span>PLAY<span>GROUND</span><b className="brand-dot">.</b></span>}</div>
}

function Tag({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <span className={`metadata-tag ${accent ? 'tag-accent' : ''}`}>{children}</span>
}

function GameCard({ game, row, column }: { game: GameInfo; row: number; column: number }) {
  const selectedId = useConsole(s => s.selectedId)
  const select = useConsole(s => s.selectGame)
  const open = useConsole(s => s.openDetails)
  const best = useConsole(s => s.data.progress.bestScores[game.id])
  return (
    <motion.button
      type="button"
      className={`game-card ${selectedId === game.id ? 'is-selected' : ''}`}
      whileHover={{ y: -5 }}
      transition={{ duration: .17 }}
      data-game-card={game.id}
      data-row={row}
      data-col={column}
      onMouseEnter={() => select(game.id)}
      onFocus={() => select(game.id)}
      onClick={() => open(game.id)}
      aria-label={`${game.title}, ${game.genre}, ${game.status === 'playable' ? 'playable' : 'coming soon'}. View details`}
    >
      <div className="card-image">
        <Artwork id={game.artwork.cover} className="card-art"/>
        <span className={`card-status ${game.status === 'playable' ? 'status-live' : ''}`}>{game.status === 'playable' ? <><span className="status-dot"/> PLAYABLE NOW</> : 'COMING SOON'}</span>
        <div className="card-art-shade"/>
      </div>
      <span className="card-bottom">
        <span className="card-bottom-text"><strong>{game.title}</strong><span>{game.genre} <b>·</b> {game.players.max} {game.players.max === 1 ? 'player' : 'players'}</span></span>
        <span className="card-arrow">{best !== undefined ? <small>BEST {best}</small> : <ArrowRight size={19}/>}</span>
      </span>
    </motion.button>
  )
}

function Shelf({ heading, subheading, list, row, id }: { heading: string; subheading: string; list: GameInfo[]; row: number; id: string }) {
  return <section className="shelf" id={id} aria-label={heading}>
    <div className="shelf-heading"><div><h2>{heading} <ArrowRight className="shelf-arrow" size={21}/></h2><p>{subheading}</p></div><span className="shelf-count">{String(list.length).padStart(2, '0')} TITLES</span></div>
    <div className="shelf-grid">{list.map((game, index) => <GameCard key={game.id} game={game} row={row} column={index}/>)}</div>
  </section>
}

function GameDetails({ game }: { game: GameInfo }) {
  const close = useConsole(s => s.closeDetails)
  const launch = useConsole(s => s.launch)
  const best = useConsole(s => s.data.progress.bestScores[game.id])
  const dialog = useRef<HTMLDivElement>(null)
  useDialogFocus(dialog, close)
  return (
    <motion.div className="dialog-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
      <motion.div ref={dialog} role="dialog" aria-modal="true" aria-label={`${game.title} game details`} tabIndex={-1} className="details-dialog" initial={{ opacity: 0, y: 28, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .97 }} transition={{ duration: .23 }}>
        <button className="dialog-close icon-button" aria-label="Close game details" onClick={close}><X size={21}/></button>
        <div className="details-art"><Artwork id={game.artwork.hero} className="hero-svg"/><span className="art-vignette"/></div>
        <div className="details-copy">
          <div className="eyebrow">{game.eyebrow} <span className="eyebrow-separator">/</span> {game.status === 'playable' ? 'READY TO PLAY' : 'IN DEVELOPMENT'}</div>
          <h2>{game.title}</h2><p className="details-tagline">{game.tagline}</p>
          <p className="details-description">{game.description}</p>
          <div className="details-tags"><Tag>{game.genre}</Tag><Tag>{game.players.max} {game.players.max === 1 ? 'PLAYER' : 'PLAYERS'}</Tag><Tag>{game.inputMethods.join(' / ').toUpperCase()}</Tag></div>
          {best !== undefined && <p className="best-detail"><Zap size={15}/> YOUR PERSONAL BEST: <strong>{best.toLocaleString()} PTS</strong></p>}
          <div className="details-instructions"><strong><Keyboard size={16}/> HOW TO PLAY</strong>{game.instructions.map(line => <p key={line}><Check size={15}/>{line}</p>)}</div>
          <div className="details-buttons">
            {game.status === 'playable' ? <button className="button-primary" onClick={() => launch(game.id)}><Play size={18} fill="currentColor"/> PLAY NOW</button> : <span className="button-unavailable"><Clock3 size={17}/> COMING SOON</span>}
            <button className="button-quiet" onClick={close}><ArrowLeft size={18}/> BACK TO LIBRARY</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SettingsDialog() {
  const settings = useConsole(s => s.data.settings)
  const update = useConsole(s => s.updateSettings)
  const close = useConsole(s => s.toggleSettings)
  const dialog = useRef<HTMLDivElement>(null)
  useDialogFocus(dialog, () => close(false))
  return (
    <motion.div className="dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (e.target === e.currentTarget) close(false) }}>
      <motion.div className="settings-dialog" role="dialog" aria-modal="true" aria-label="Console settings" tabIndex={-1} ref={dialog} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <div className="settings-head"><div><span className="eyebrow">YOUR ARCADE, YOUR WAY</span><h2>Console settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={() => close(false)}><X size={20}/></button></div>
        <div className="setting-row"><div><strong><Headphones size={18}/> Game volume</strong><p>Original sound effects, played after interaction</p></div><div className="volume-control"><button className="icon-button" onClick={() => update({ muted: !settings.muted })} aria-label={settings.muted ? 'Unmute sounds' : 'Mute sounds'}>{settings.muted ? <VolumeX/> : <Volume2/>}</button><input aria-label="Game volume" type="range" min="0" max="100" value={Math.round(settings.volume * 100)} onChange={e => update({ volume: Number(e.target.value) / 100 })}/><span>{Math.round(settings.volume * 100)}%</span></div></div>
        <div className="setting-row"><div><strong><Headphones size={18}/> Music level</strong><p>Original Kasi Maze soundtrack, mixed separately from effects</p></div><div className="volume-control"><input aria-label="Music volume" type="range" min="0" max="100" value={Math.round(settings.musicVolume * 100)} onChange={e => update({ musicVolume: Number(e.target.value) / 100 })}/><span>{Math.round(settings.musicVolume * 100)}%</span></div></div>
        <div className="setting-row"><div><strong><Sparkles size={18}/> Reduced motion</strong><p>Minimize interface animation effects</p></div><button role="switch" aria-checked={settings.reducedMotion} className={`toggle ${settings.reducedMotion ? 'on' : ''}`} onClick={() => update({ reducedMotion: !settings.reducedMotion })}><span/></button></div>
        <div className="setting-row"><div><strong><Clock3 size={18}/> Local demo timer</strong><p>Optional free-play limit, not a secure paid session</p></div><select aria-label="Local demo timer" value={settings.demoMinutes ?? 'off'} onChange={e => update({ demoMinutes: e.target.value === 'off' ? null : Number(e.target.value) })}><option value="off">Unlimited</option><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option></select></div>
        <div className="setting-row"><div><strong><Maximize2 size={18}/> Fullscreen</strong><p>{isFullscreenSupported() ? 'Expand the console on this screen' : 'Not supported in this browser'}</p></div><button className="button-small" onClick={() => void toggleFullscreen()} disabled={!isFullscreenSupported()}>TOGGLE</button></div>
        <div className="keyboard-help"><strong><CircleHelp size={17}/> KEYBOARD SHORTCUTS</strong><p><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> Browse games <span>·</span> <kbd>ENTER</kbd> Select <span>·</span> <kbd>ESC</kbd> Back <span>·</span> <kbd>F</kbd> Fullscreen</p><p>In-game: <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> Move <span>·</span> <kbd>P</kbd> Pause <span>·</span> <kbd>R</kbd> Restart. Neon Dodge: <kbd>SPACE</kbd> shield.</p></div>
        <p className="settings-disclaimer">Preferences and high scores stay in this browser. No account or payment is connected.</p>
      </motion.div>
    </motion.div>
  )
}

const libraryRows = [
  games.filter(game => game.status === 'playable'),
  games.filter(game => game.status === 'coming-soon'),
]

function Launcher() {
  const view = useConsole(s => s.view)
  const selectedId = useConsole(s => s.selectedId)
  const settingsOpen = useConsole(s => s.settingsOpen)
  const recent = useConsole(s => s.data.progress.recent)
  const totalPlays = useConsole(s => s.data.progress.totalPlays)
  const reducedMotion = useConsole(s => s.data.settings.reducedMotion)
  const details = gameById(selectedId)
  const openDetails = useConsole(s => s.openDetails)
  const launch = useConsole(s => s.launch)
  const toggleSettings = useConsole(s => s.toggleSettings)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [navSection, setNavSection] = useState('DISCOVER')
  const [headerScrolled, setHeaderScrolled] = useState(false)
  useEffect(() => {
    const update = () => {
      const position = window.scrollY
      setHeaderScrolled(position > 36)
      const viewportAnchor = position + window.innerHeight * 0.35
      const recentTop = document.getElementById('recent')?.offsetTop ?? Infinity
      const gamesTop = document.getElementById('library')?.offsetTop ?? Infinity
      setNavSection(viewportAnchor >= recentTop ? 'MY PLAYS' : viewportAnchor >= gamesTop ? 'GAMES' : 'DISCOVER')
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  function goTo(id: string) {
    setMobileMenu(false)
    setNavSection(id === 'top' ? 'DISCOVER' : id === 'recent' ? 'MY PLAYS' : 'GAMES')
    document.getElementById(id)?.scrollIntoView({ behavior: useConsole.getState().data.settings.reducedMotion ? 'instant' : 'smooth', block: 'start' })
  }

  useEffect(() => {
    const off = inputRouter.subscribe(event => {
      if (event.playerId !== 'player-1' || event.phase !== 'pressed') return
      const state = useConsole.getState()
      if (state.settingsOpen) {
        if (event.action === 'BACK' && !event.repeated) state.toggleSettings(false)
        return
      }
      if (state.view === 'GAME_DETAILS') {
        if (event.action === 'TOGGLE_FULLSCREEN' && !event.repeated) { void toggleFullscreen(); return }
        if (event.action === 'BACK' && !event.repeated) state.closeDetails()
        else if ((event.action === 'CONFIRM' || event.action === 'PRIMARY_ACTION') && !event.repeated) state.launch(state.selectedId)
        return
      }
      if (!['ATTRACT', 'BROWSING'].includes(state.view)) return
      if (event.action === 'TOGGLE_FULLSCREEN' && !event.repeated) { void toggleFullscreen(); return }
      if (event.action === 'CONFIRM' || event.action === 'PRIMARY_ACTION') {
        if (!event.repeated) state.openDetails(state.selectedId)
        return
      }
      if (event.repeated && event.action !== 'MOVE_LEFT' && event.action !== 'MOVE_RIGHT' && event.action !== 'MOVE_UP' && event.action !== 'MOVE_DOWN') return
      if (!['MOVE_LEFT', 'MOVE_RIGHT', 'MOVE_UP', 'MOVE_DOWN'].includes(event.action)) return
      const rowIndex = Math.max(0, libraryRows.findIndex(row => row.some(game => game.id === state.selectedId)))
      const colIndex = Math.max(0, libraryRows[rowIndex].findIndex(game => game.id === state.selectedId))
      const newRow = event.action === 'MOVE_UP' ? Math.max(0, rowIndex - 1) : event.action === 'MOVE_DOWN' ? Math.min(libraryRows.length - 1, rowIndex + 1) : rowIndex
      const newCol = event.action === 'MOVE_LEFT' ? Math.max(0, colIndex - 1) : event.action === 'MOVE_RIGHT' ? Math.min(libraryRows[newRow].length - 1, colIndex + 1) : Math.min(libraryRows[newRow].length - 1, colIndex)
      const game = libraryRows[newRow]?.[newCol]
      if (game) {
        state.browse()
        state.selectGame(game.id)
        const target = document.querySelector<HTMLElement>(`[data-game-card="${game.id}"]`)
        target?.focus({ preventScroll: false })
        target?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
      }
    })
    return off
  }, [])

  return <div className={`console-shell ${reducedMotion ? "reduce-motion" : ""}`} id="top">
    <header className={`main-header ${headerScrolled ? "header-scrolled" : ""}`}>
      <button className="brand-button" onClick={() => goTo('top')} aria-label="Go to the top of Playground"><Brand/></button>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button className={navSection === 'DISCOVER' ? 'active' : ''} onClick={() => goTo('top')}>Discover</button>
        <button className={navSection === 'GAMES' ? 'active' : ''} onClick={() => goTo('library')}>Games</button>
        <button className={navSection === 'MY PLAYS' ? 'active' : ''} onClick={() => goTo('recent')}>My Plays</button>
      </nav>
      <div className="header-actions"><button className="icon-button settings-trigger" aria-label="Open settings" onClick={() => toggleSettings(true)}><Settings2 size={20}/></button><button className="icon-button mobile-menu-trigger" aria-label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20}/> : <Menu size={20}/>}</button></div>
    </header>
    {mobileMenu && <nav className="mobile-nav" aria-label="Mobile navigation"><button onClick={() => goTo('top')}>Discover</button><button onClick={() => goTo('library')}>Games</button><button onClick={() => goTo('recent')}>My Plays</button><button onClick={() => { setMobileMenu(false); toggleSettings(true) }}>Settings</button></nav>}
    <main>
      <section className="hero" aria-label="Featured game">
        <div className="hero-visual" aria-hidden="true"><Artwork id="kasi-maze" className="hero-svg"/><div className="hero-shade"/></div>
        <div className="hero-content">
          <div className="hero-overline"><span className="status-dot" aria-hidden="true"/> A PLAYGROUND ORIGINAL <span className="hero-overline-index">/ 01</span></div>
          <h1>KASI<br/><em>MAZE<span>.</span></em></h1>
          <p className="hero-tagline">OWN THE STREETS. OUTRUN THE CREW.</p>
          <p className="hero-description">One maze. Four rival crews. Three lives.<span className="hero-description-break"> Collect the beats, turn the tables, own the district.</span></p>
          <div className="hero-buttons">
            <button className="button-primary hero-play" data-testid="hero-play" onClick={() => launch('kasi-maze')}><Play size={19} fill="currentColor"/> PLAY NOW</button>
            <button className="button-outline" onClick={() => openDetails('kasi-maze')}><CircleHelp size={18}/> MORE INFO</button>
          </div>
          <div className="hero-metadata" aria-label="Game information">
            <span className="hero-available"><span className="status-dot" aria-hidden="true"/> Playable now</span>
            <span>1 player</span><span>Maze chase</span><span>Keyboard / touch</span>
          </div>
        </div>
        <button className="hero-scroll" onClick={() => goTo('library')}>EXPLORE THE GAMES <ArrowDownRight size={17}/></button>
      </section>

      <div className="library-wrap" id="library">
        <div className="section-intro"><span className="eyebrow">THE PLAYGROUND COLLECTION</span><h2>PICK YOUR <em>NEXT GAME.</em></h2><p>No downloads, no setup. Just choose a game and play.</p></div>
        <Shelf heading="Ready to play" subheading="Jump right in" list={libraryRows[0]} row={0} id="play-now"/>
        <Shelf heading="Coming to the arcade" subheading="A preview of what’s next" list={libraryRows[1]} row={1} id="coming-soon"/>
      </div>

      <section className="recent-section" id="recent">
        <div className="recent-head"><div><span className="eyebrow"><Clock3 size={14}/> PICK UP WHERE YOU LEFT OFF</span><h2>YOUR ARCADE STORY.</h2></div><div className="session-total"><strong>{totalPlays.toString().padStart(2, '0')}</strong><span>TOTAL PLAYS</span></div></div>
        {recent.length > 0 ? <div className="recent-row">{recent.map(id => { const game = gameById(id); if (!game) return null; return <button className="recent-game" key={id} onClick={() => openDetails(id)}><span className="recent-thumb"><Artwork id={game.artwork.cover}/></span><span><strong>{game.title}</strong><small>BEST {useConsole.getState().data.progress.bestScores[id] ?? 0} PTS</small></span><ArrowRight size={18}/></button> })}</div> :
          <div className="recent-empty"><span className="empty-gamepad"><Gamepad2 size={30}/></span><div><strong>No runs yet. That's about to change.</strong><p>Your recent games and best scores will live here after your first session.</p></div><button className="button-small" onClick={() => launch('kasi-maze')}>START PLAYING <ArrowRight size={15}/></button></div>}
      </section>

      <section className="closing-banner"><div><span className="eyebrow">BUILT TO PLAY, ANYWHERE</span><h2>ONE SCREEN.<br/><em>INFINITE POSSIBILITIES.</em></h2><p>First your laptop. Next, the whole arcade.</p></div><div className="closing-art"><Gamepad2 size={132} strokeWidth={.7}/><span className="closing-ring"/></div></section>
    </main>
    <footer className="footer"><Brand/><span>THE WORLD IS YOUR PLAYGROUND.</span><span>© 2026 PLAYGROUND <b>•</b> PHASE 01</span></footer>
    <AnimatePresence>{view === 'GAME_DETAILS' && details && <GameDetails key={details.id} game={details}/>}</AnimatePresence>
    <AnimatePresence>{settingsOpen && <SettingsDialog key="settings"/>}</AnimatePresence>
  </div>
}

export default function Console() {
  const view = useConsole(s => s.view)
  const activeId = useConsole(s => s.activeGameId)
  const reduced = useConsole(s => s.data.settings.reducedMotion)
  useEffect(() => {
    const adapter = new KeyboardAdapter()
    adapter.start(inputRouter)
    return () => adapter.stop()
  }, [])
  useEffect(() => {
    if (activeId) document.title = `${gameById(activeId)?.title ?? 'Arcade'} | PLAYGROUND`
    else document.title = 'PLAYGROUND — Your arcade. Your rules.'
  }, [activeId])
  const gaming = !!activeId && ['LOADING', 'PLAYING', 'PAUSED', 'SESSION_ENDED', 'ERROR'].includes(view)
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
    <AnimatePresence mode="wait">
      {gaming ? <motion.div key="gaming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}><GameStage/></motion.div> :
        <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}><Launcher/></motion.div>}
    </AnimatePresence>
  </MotionConfig>
}
