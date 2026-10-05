// Chrome shows the focus ring on a clicked button once any key is pressed, and menus
// hand focus back to their trigger on Escape. For mouse users both leave a stray ring.
let pointer = true

function isButton(el: Element | null) {
  return el instanceof HTMLElement && el.matches('button, [role="button"], a[href]')
}

/** Starts tracking whether the user drives the UI with the pointer or the keyboard. */
export function trackInputModality() {
  if (typeof document === 'undefined') return
  document.addEventListener('pointerdown', () => (pointer = true), true)
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') pointer = false
      else if (pointer && isButton(document.activeElement)) {
        ;(document.activeElement as HTMLElement).blur()
      }
    },
    true,
  )
}

/** onCloseAutoFocus handler: return focus to the trigger only for keyboard users. */
export function restoreFocusForKeyboard(event: Event) {
  if (pointer) event.preventDefault()
}
