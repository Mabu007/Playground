export function isFullscreenSupported() { return typeof document !== 'undefined' && document.fullscreenEnabled }
export function isFullscreen() { return typeof document !== 'undefined' && !!document.fullscreenElement }
export async function toggleFullscreen(element: HTMLElement = document.documentElement): Promise<boolean> {
  if (!isFullscreenSupported()) return false
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await element.requestFullscreen()
    return true
  } catch { return false }
}
