import { create } from 'zustand'
import { assertTransition, type ConsoleView } from './machine'
import { gameById } from '../games/registry'
import { loadData, saveData, withPlay, withSession, type LocalData, type Settings } from '../storage'
import { sessionManager, type EndReason } from '../sessions/SessionManager'
import { playerManager } from '../players/PlayerManager'
export interface ConsoleState {
  view: ConsoleView
  selectedId: string
  activeGameId: string | null
  score: number
  elapsedMs: number
  remainingMs: number | null
  error: string | null
  settingsOpen: boolean
  data: LocalData
  browse(): void
  selectGame(id: string): void
  openDetails(id: string): void
  closeDetails(): void
  launch(id: string): boolean
  started(): void
  setScore(score: number): void
  setClock(elapsedMs: number, remainingMs: number | null): void
  pause(): void
  resume(): void
  end(reason: EndReason): void
  restart(): void
  exit(): void
  fail(message: string): void
  updateSettings(update: Partial<Settings>): void
  toggleSettings(open?: boolean): void
}
const initial = loadData()
export const useConsole = create<ConsoleState>((set, get) => {
  const move = (view: ConsoleView) => { assertTransition(get().view, view); set({ view }) }
  const commit = (data: LocalData) => { saveData(data); set({ data }) }
  const record = (reason: EndReason) => {
    const snap = sessionManager.snapshot()
    if (snap.state === 'IDLE' || snap.state === 'READY' || snap.state === 'ENDED' || !snap.gameId) return
    sessionManager.end(reason)
    const ended = sessionManager.snapshot()
    const updated = withSession(get().data, {
      id: ended.id, gameId: ended.gameId!, score: get().score, elapsedMs: ended.elapsedMs,
      endedAt: Date.now(), reason,
    })
    commit(updated)
    playerManager.assignSession('player-1', null)
  }
  return {
    view: 'ATTRACT', selectedId: 'neon-dodge', activeGameId: null, score: 0, elapsedMs: 0,
    remainingMs: null, error: null, settingsOpen: false, data: initial,
    browse: () => { if (get().view === 'ATTRACT') move('BROWSING') },
    selectGame: (id) => { if (gameById(id)) set({ selectedId: id }) },
    openDetails: (id) => {
      if (!gameById(id) || !['ATTRACT', 'BROWSING', 'GAME_DETAILS'].includes(get().view)) return
      move('GAME_DETAILS')
      set({ selectedId: id })
    },
    closeDetails: () => { if (get().view === 'GAME_DETAILS') move('BROWSING') },
    launch: (id) => {
      const game = gameById(id)
      if (!game || game.status !== 'playable' || !game.load || !['ATTRACT', 'BROWSING', 'GAME_DETAILS', 'SESSION_ENDED', 'ERROR'].includes(get().view)) return false
      move('LOADING')
      set({ activeGameId: id, selectedId: id, score: 0, elapsedMs: 0, remainingMs: null, error: null, settingsOpen: false })
      return true
    },
    started: () => {
      if (get().view !== 'LOADING') return
      const id = get().activeGameId
      if (!id) return
      move('PLAYING')
      commit(withPlay(get().data, id))
    },
    setScore: (score) => { if (['PLAYING', 'PAUSED'].includes(get().view)) set({ score: Math.max(0, Math.floor(score)) }) },
    setClock: (elapsedMs, remainingMs) => {
      if (['PLAYING', 'PAUSED', 'SESSION_ENDED'].includes(get().view)) set({ elapsedMs, remainingMs })
    },
    pause: () => { if (get().view === 'PLAYING') { sessionManager.pause(); move('PAUSED') } },
    resume: () => { if (get().view === 'PAUSED') { sessionManager.resume(); move('PLAYING') } },
    end: (reason) => {
      if (!['PLAYING', 'PAUSED'].includes(get().view)) return
      record(reason)
      move('SESSION_ENDED')
    },
    restart: () => {
      if (!['PLAYING', 'PAUSED', 'SESSION_ENDED'].includes(get().view) || !get().activeGameId) return
      record('restart')
      sessionManager.prepare(get().activeGameId!, ['player-1'], get().data.settings.demoMinutes)
      sessionManager.start()
      playerManager.assignSession('player-1', sessionManager.snapshot().id)
      set({ score: 0, elapsedMs: 0, remainingMs: sessionManager.snapshot().remainingMs })
      move('PLAYING')
      commit(withPlay(get().data, get().activeGameId!))
    },
    exit: () => {
      if (['PLAYING', 'PAUSED'].includes(get().view)) record('exit')
      if (get().view === 'LOADING') { /* Cancelled launch has no active session. */ }
      if (get().view !== 'ATTRACT') move('ATTRACT')
      set({ activeGameId: null, score: 0, elapsedMs: 0, remainingMs: null, error: null, settingsOpen: false })
    },
    fail: (message) => {
      if (['PLAYING', 'PAUSED'].includes(get().view)) record('error')
      if (get().view === 'LOADING' || get().view === 'PLAYING' || get().view === 'PAUSED') move('ERROR')
      set({ error: message })
    },
    updateSettings: (update) => { commit({ ...get().data, settings: { ...get().data.settings, ...update } }) },
    toggleSettings: (open) => set({ settingsOpen: open ?? !get().settingsOpen }),
  }
})
