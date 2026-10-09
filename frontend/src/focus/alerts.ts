import type { Phase } from './timer'

let audio: AudioContext | null = null

/** Browsers start audio only from a gesture, so the play click unlocks it for the chime later. */
export function primeAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function chime() {
  if (!audio) return
  const start = audio.currentTime + 0.05
  // Two soft notes, a fifth apart, like a desk bell.
  for (const [freq, at] of [
    [784, 0],
    [1175, 0.18],
  ] as const) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start + at)
    gain.gain.linearRampToValueAtTime(0.18, start + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 1.4)
    osc.connect(gain).connect(audio.destination)
    osc.start(start + at)
    osc.stop(start + at + 1.5)
  }
}

export type NotifyPermission = NotificationPermission | 'unsupported'

export function notifyPermission(): NotifyPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function askNotify(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

const MESSAGES: Record<Phase, [string, string]> = {
  focus: ['Focus done', 'Time for a break.'],
  short: ['Break over', 'Ready for the next focus.'],
  long: ['Long break over', 'Ready for a new cycle.'],
}

export function notify(phase: Phase) {
  if (notifyPermission() !== 'granted') return
  const [title, body] = MESSAGES[phase]
  try {
    new Notification(title, { body, tag: 'tiko-focus' })
  } catch {
    // Some mobile browsers allow notifications only from a service worker.
  }
}
