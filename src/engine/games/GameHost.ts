import type { GameContext, GameInfo, GameInstance } from './types'

/** A single-instance, generation-guarded launcher. Never stores a Phaser dependency in React. */
export class GameHost {
  private instance: GameInstance | null = null
  private generation = 0
  private loading = false

  get isActive() { return this.instance !== null }
  get isLoading() { return this.loading }
  get activeCount() { return this.instance ? 1 : 0 }

  async launch(game: GameInfo, context: GameContext): Promise<boolean> {
    if (!game.load || game.status !== 'playable' || this.loading || this.instance) return false
    this.loading = true
    const current = ++this.generation
    try {
      const module = await game.load()
      if (current !== this.generation) return false
      const instance = await module.mount(context)
      if (current !== this.generation) { instance.destroy(); return false }
      this.instance = instance
      instance.start()
      return true
    } finally {
      if (current === this.generation) this.loading = false
    }
  }
  pause() { this.instance?.pause() }
  resume() { this.instance?.resume() }
  restart() { this.instance?.restart() }
  destroy() {
    ++this.generation
    this.loading = false
    const old = this.instance
    this.instance = null
    old?.destroy()
  }
}
