import { useSyncExternalStore } from 'react'
import { newId } from '@/lib/id'
import * as library from './library'
import type { Mode } from './timer'

export interface Track {
  title: string
  author: string
  src: string
  /** Seconds; read from the file once it plays for the user's own tracks. */
  duration?: number
  /** Set for the user's own tracks, which live in IndexedDB. */
  id?: string
}

export const trackKey = (track: Track) => track.id ?? track.src

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
    saved = typeof raw.current === 'string' ? raw.current : null
    const index = Math.max(
      0,
      BUILT_IN.findIndex((track) => track.src === saved),
    )
    const volume =
      typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : fresh.volume
    return { ...fresh, index, volume, pauseOnBreaks: raw.pauseOnBreaks !== false }
  } catch {
    return fresh
  }
}

let state: MusicState | null = null
// The track the user last picked, kept until their own tracks come back from IndexedDB.
let saved: string | null = null
let restored = false
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
    const { index, volume, pauseOnBreaks, tracks } = state
    const track = tracks[index]
    localStorage.setItem(
      KEY,
      JSON.stringify({ current: track && trackKey(track), volume, pauseOnBreaks }),
    )
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
    audio.addEventListener('loadedmetadata', rememberDuration)
    audio.addEventListener(
      'pause',
      () => current().playing && !audio?.ended && set({ playing: false }),
    )
  }
  return audio
}

// Own files have no known length until the browser reads them.
function rememberDuration() {
  const { tracks, index } = current()
  const track = tracks[index]
  const seconds = audio?.duration
  if (!track?.id || track.duration !== undefined || !seconds || !Number.isFinite(seconds)) return
  set({ tracks: tracks.map((t, i) => (i === index ? { ...t, duration: seconds } : t)) })
  void library
    .listTracks()
    .then((stored) => stored.find((s) => s.id === track.id))
    .then((stored) => stored && library.saveTrack({ ...stored, duration: seconds }))
    .catch(() => {})
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

function fromStored(stored: library.StoredTrack): Track {
  return {
    id: stored.id,
    title: stored.title,
    author: 'Your file',
    src: URL.createObjectURL(stored.file),
    duration: stored.duration,
  }
}

/** Brings back the user's own tracks saved in earlier visits. */
export async function restoreOwnTracks() {
  if (restored) return
  restored = true
  let stored: library.StoredTrack[]
  try {
    stored = await library.listTracks()
  } catch {
    return
  }
  const { tracks, playing, index } = current()
  const known = new Set(tracks.map(trackKey))
  const own = stored.filter((s) => !known.has(s.id)).map(fromStored)
  if (own.length === 0) return
  const merged = [...tracks, ...own]
  const savedIndex = merged.findIndex((track) => trackKey(track) === saved)
  set({ tracks: merged, index: !playing && savedIndex >= 0 ? savedIndex : index })
}

/** Adds audio files from disk, keeps them in this browser and plays the first one. */
export async function addFiles(files: Iterable<File>) {
  const audioFiles = [...files].filter((file) => file.type.startsWith('audio/'))
  if (audioFiles.length === 0) return
  const added = Date.now()
  const stored = audioFiles.map((file, i) => ({
    id: newId(),
    title: titleFromFile(file.name),
    file,
    added: added + i,
  }))
  // A blocked or full storage still lets the files play until the tab closes.
  await Promise.all(stored.map((s) => library.saveTrack(s).catch(() => {})))
  const tracks = [...current().tracks, ...stored.map(fromStored)]
  set({ tracks })
  pick(tracks.length - stored.length)
}

/** Deletes one of the user's own tracks from the list and from the browser. */
export function removeOwnTrack(id: string) {
  const { tracks, index, playing } = current()
  const at = tracks.findIndex((track) => track.id === id)
  if (at < 0) return
  URL.revokeObjectURL(tracks[at].src)
  void library.removeTrack(id).catch(() => {})
  const rest = tracks.filter((_, i) => i !== at)
  if (at === index) {
    audio?.pause()
    set({ tracks: rest, index: 0, playing: false })
    if (playing) play()
  } else {
    set({ tracks: rest, index: at < index ? index - 1 : index })
  }
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
  void restoreOwnTracks()
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
  saved = null
  restored = false
}
