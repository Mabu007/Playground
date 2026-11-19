import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Trap Tab inside overlays and return focus to the opener when leaving.
 * Window keyboard actions are still routed by the normal input adapter.
 */
export function useDialogFocus(ref: RefObject<HTMLDivElement | null>, onEscape: () => void, enabled = true) {
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape
  const opener = useRef<HTMLElement | null>(null)
  const pendingRestore = useRef(0)
  useLayoutEffect(() => {
    const panel = ref.current
    if (!enabled || !panel) return
    cancelAnimationFrame(pendingRestore.current)
    const active = document.activeElement
    if (active instanceof HTMLElement && !panel.contains(active)) opener.current = active
    panel.focus({ preventScroll: true })
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        escapeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0)
      if (!focusable.length) { event.preventDefault(); panel.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = oldOverflow
      const target = opener.current
      if (target?.isConnected) pendingRestore.current = requestAnimationFrame(() => {
        if (target.isConnected) target.focus({ preventScroll: true })
      })
    }
  }, [ref, enabled])
}
