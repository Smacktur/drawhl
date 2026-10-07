import { useSyncExternalStore } from 'react'
import type { Mode } from './timer'

export interface Track {
  title: string
  author: string
  src: string
  /** Seconds; unknown for the user's own files. */
  duration?: number
  own?: boolean
}

// CC0 tracks from OpenGameArt, see THIRD_PARTY.md.
export const BUILT_IN: Track[] = [
  {
    title: 'Laundry On The Wire',
    author: 'HoliznaCC0',
    src: '/music/laundry-on-the-wire.mp3',
    duration: 180,
  },
  { title: 'Keeping Cool', author: 'HoliznaCC0', src: '/music/keeping-cool.mp3', duration: 153 },
  { title: 'First Snow', author: 'HoliznaCC0', src: '/music/first-snow.mp3', duration: 174 },
  { title: '2 Hour Delay', author: 'HoliznaCC0', src: '/music/2-hour-delay.mp3', duration: 132 },
  { title: 'Families', author: 'HoliznaCC0', src: '/music/families.mp3', duration: 144 },
  { title: 'Autumn', author: 'HoliznaCC0', src: '/music/autumn.mp3', duration: 170 },
  {
    title: 'Lofi Hip Hop Loop',
    author: 'omfgdude',
    src: '/music/lofi-hip-hop-loop.mp3',
    duration: 128,
  },
]

export interface MusicState {
  tracks: Track[]
  index: number
  playing: boolean
  volume: number
  pauseOnBreaks: boolean
}

const KEY = 'drawhl.music'

export function nextIndex(index: number, count: number): number {
  return count === 0 ? 0 : (index + 1) % count
}

/** "Lo-fi_study beat.mp3" → "Lo-fi study beat". */
export function titleFromFile(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[_]+/g, ' ')
      .trim() || name
  )
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function load(): MusicState {
  const fresh: MusicState = {
    tracks: BUILT_IN,
    index: 0,
    playing: false,
    volume: 0.5,
    pauseOnBreaks: true,
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return fresh
    const index =
      Number.isInteger(raw.index) && raw.index >= 0 && raw.index < BUILT_IN.length ? raw.index : 0
    const volume =
      typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : fresh.volume
    return { ...fresh, index, volume, pauseOnBreaks: raw.pauseOnBreaks !== false }
  } catch {
    return fresh
  }
}

let state: MusicState | null = null
let audio: HTMLAudioElement | null = null
let heldForBreak = false
const listeners = new Set<() => void>()

function current(): MusicState {
  state ??= load()
  return state
}

function set(patch: Partial<MusicState>) {
  state = { ...current(), ...patch }
  try {
    // Own files are object URLs that die with the page, so only a built-in track is remembered.
    const { index, volume, pauseOnBreaks, tracks } = state
    const saved = tracks[index]?.own ? 0 : index
    localStorage.setItem(KEY, JSON.stringify({ index: saved, volume, pauseOnBreaks }))
  } catch {
    // Storage blocked: settings live for this page.
  }
  listeners.forEach((listener) => listener())
}

function player(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('ended', () => pick(nextIndex(current().index, current().tracks.length)))
    audio.addEventListener(
      'pause',
      () => current().playing && !audio?.ended && set({ playing: false }),
    )
  }
  return audio
}

function loadTrack(index: number) {
  const a = player()
  const track = current().tracks[index]
  if (!track) return
  const src = new URL(track.src, window.location.href).href
  if (a.src !== src) a.src = src
  a.volume = current().volume
}

export function play() {
  const { index } = current()
  loadTrack(index)
  set({ playing: true })
  player()
    .play()
    .catch(() => set({ playing: false }))
}

export function pause() {
  set({ playing: false })
  audio?.pause()
}

export function toggle() {
  heldForBreak = false
  if (current().playing) pause()
  else play()
}

export function pick(index: number) {
  set({ index })
  play()
}

export function next() {
  const { index, tracks, playing } = current()
  const to = nextIndex(index, tracks.length)
  if (playing) pick(to)
  else set({ index: to })
}

export function setVolume(volume: number) {
  set({ volume })
  if (audio) audio.volume = volume
}

export function setPauseOnBreaks(pauseOnBreaks: boolean) {
  set({ pauseOnBreaks })
}

export function addFiles(files: Iterable<File>) {
  const own: Track[] = [...files]
    .filter((file) => file.type.startsWith('audio/'))
    .map((file) => ({
      title: titleFromFile(file.name),
      author: 'Your file',
      src: URL.createObjectURL(file),
      own: true,
    }))
  if (own.length === 0) return
  const tracks = [...current().tracks, ...own]
  set({ tracks })
  pick(tracks.length - own.length)
}

/** Pauses music when a break starts and brings it back with the next focus. */
export function followTimer(mode: Mode) {
  const { playing, pauseOnBreaks } = current()
  if (mode === 'break' && playing && pauseOnBreaks) {
    heldForBreak = true
    pause()
  } else if (mode === 'focus' && heldForBreak) {
    heldForBreak = false
    play()
  } else if (mode === 'focus' || mode === 'idle') {
    heldForBreak = false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const serverState: MusicState = {
  tracks: BUILT_IN,
  index: 0,
  playing: false,
  volume: 0.5,
  pauseOnBreaks: true,
}

export function useMusic(): MusicState {
  return useSyncExternalStore(subscribe, current, () => serverState)
}

/** Tests start from a clean player. */
export function resetMusic() {
  audio?.pause()
  audio = null
  heldForBreak = false
  state = null
}
