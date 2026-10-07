import type { Mode } from './timer'

export interface Tone {
  hue: number
  /** Second hue of the drifting gradient. */
  hue2: number
  chroma: number
}

// Green at the start of a focus, through sand and peach, to raspberry at the end.
const FOCUS_STOPS: [progress: number, hue: number, chroma: number][] = [
  [0, 150, 0.055],
  [0.5, 95, 0.06],
  [0.8, 55, 0.065],
  [1, 8, 0.075],
]

function focusAt(progress: number): [number, number] {
  const p = Math.min(1, Math.max(0, progress))
  for (let i = 1; i < FOCUS_STOPS.length; i++) {
    const [p0, h0, c0] = FOCUS_STOPS[i - 1]
    const [p1, h1, c1] = FOCUS_STOPS[i]
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0)
      return [h0 + (h1 - h0) * t, c0 + (c1 - c0) * t]
    }
  }
  return [8, 0.075]
}

export function tone(mode: Mode, progress: number): Tone {
  switch (mode) {
    case 'focus': {
      const [hue, chroma] = focusAt(progress)
      return { hue, hue2: focusAt(progress + 0.18)[0], chroma }
    }
    case 'rested': {
      const [hue, chroma] = focusAt(0)
      return { hue, hue2: focusAt(0.18)[0], chroma }
    }
    case 'done':
      return { hue: 8, hue2: 352, chroma: 0.075 }
    case 'paused':
      return { hue: 250, hue2: 262, chroma: 0.04 }
    case 'break':
      return { hue: 300, hue2: 285, chroma: 0.045 }
    case 'idle':
      return { hue: 260, hue2: 255, chroma: 0.006 }
  }
}
