export interface Settings {
  volume: number
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
}
export interface Progress {
  totalPlays: number
  recent: string[]
  bestScores: Record<string, number>
  sessions: SessionRecord[]
}
export interface LocalData { version: 1; settings: Settings; progress: Progress }
export const DEFAULT_SETTINGS: Settings = { volume: 0.55, muted: false, reducedMotion: false, demoMinutes: null }
const KEY = 'playground:v1'
export function defaultData(): LocalData {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, progress: { totalPlays: 0, recent: [], bestScores: {}, sessions: [] } }
}
const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
export function loadData(): LocalData {
  const fallback = defaultData()
  try {
    const raw = storage()?.getItem(KEY)
    if (!raw) return fallback
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1) return fallback
    const candidate = data as Partial<LocalData>
    const settings = candidate.settings
    const progress = candidate.progress
    return {
      version: 1,
      settings: {
        volume: typeof settings?.volume === 'number' && Number.isFinite(settings.volume) ? Math.max(0, Math.min(1, settings.volume)) : fallback.settings.volume,
        muted: typeof settings?.muted === 'boolean' ? settings.muted : fallback.settings.muted,
        reducedMotion: typeof settings?.reducedMotion === 'boolean' ? settings.reducedMotion : fallback.settings.reducedMotion,
        demoMinutes: settings?.demoMinutes === null || [1, 3, 5].includes(settings?.demoMinutes ?? -1) ? (settings?.demoMinutes ?? null) : null,
      },
      progress: {
        totalPlays: typeof progress?.totalPlays === 'number' && progress.totalPlays >= 0 ? progress.totalPlays : 0,
        recent: Array.isArray(progress?.recent) ? progress.recent.filter((v): v is string => typeof v === 'string').slice(0, 6) : [],
        bestScores: progress?.bestScores && typeof progress.bestScores === 'object' ? Object.fromEntries(Object.entries(progress.bestScores).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0)) : {},
        sessions: Array.isArray(progress?.sessions) ? progress.sessions.filter((v): v is SessionRecord => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.gameId === 'string' && typeof v.score === 'number' && typeof v.elapsedMs === 'number' && typeof v.endedAt === 'number' && typeof v.reason === 'string').slice(0, 40) : [],
      },
    }
  } catch { return fallback }
}
export function saveData(data: LocalData) {
  try { storage()?.setItem(KEY, JSON.stringify(data)) } catch { /* Storage can be disabled or full. Gameplay still works. */ }
}
export function withPlay(data: LocalData, gameId: string): LocalData {
  return { ...data, progress: { ...data.progress, totalPlays: data.progress.totalPlays + 1, recent: [gameId, ...data.progress.recent.filter(id => id !== gameId)].slice(0, 6) } }
}
export function withSession(data: LocalData, session: SessionRecord): LocalData {
  return {
    ...data,
    progress: {
      ...data.progress,
      bestScores: { ...data.progress.bestScores, [session.gameId]: Math.max(data.progress.bestScores[session.gameId] ?? 0, Math.floor(session.score)) },
      sessions: [session, ...data.progress.sessions].slice(0, 40),
    },
  }
}
