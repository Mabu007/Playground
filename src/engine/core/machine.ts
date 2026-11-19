export type ConsoleView = 'ATTRACT' | 'BROWSING' | 'GAME_DETAILS' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'SESSION_ENDED' | 'ERROR'
const transitions: Record<ConsoleView, ConsoleView[]> = {
  ATTRACT: ['BROWSING', 'GAME_DETAILS', 'LOADING'],
  BROWSING: ['ATTRACT', 'GAME_DETAILS', 'LOADING'],
  GAME_DETAILS: ['BROWSING', 'ATTRACT', 'LOADING'],
  LOADING: ['PLAYING', 'ERROR', 'ATTRACT', 'BROWSING'],
  PLAYING: ['PAUSED', 'SESSION_ENDED', 'ERROR', 'ATTRACT'],
  PAUSED: ['PLAYING', 'SESSION_ENDED', 'ERROR', 'ATTRACT'],
  SESSION_ENDED: ['PLAYING', 'LOADING', 'ATTRACT', 'BROWSING'],
  ERROR: ['ATTRACT', 'BROWSING', 'LOADING'],
}
export function canTransition(from: ConsoleView, to: ConsoleView): boolean { return from === to || transitions[from].includes(to) }
export function assertTransition(from: ConsoleView, to: ConsoleView) {
  if (!canTransition(from, to)) throw new Error(`Invalid console transition ${from} -> ${to}`)
}
