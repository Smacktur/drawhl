import { beforeEach, expect, it, vi } from 'vitest'
import * as music from './music'

const play = vi.fn(() => Promise.resolve())
const pause = vi.fn()

beforeEach(() => {
  // jsdom has no media playback.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
  music.resetMusic()
  play.mockClear()
  pause.mockClear()
  localStorage.clear()
})

it('cycles through the playlist', () => {
  expect(music.nextIndex(0, 7)).toBe(1)
  expect(music.nextIndex(6, 7)).toBe(0)
})

it('names own files after the file', () => {
  expect(music.titleFromFile('rainy_night beat.mp3')).toBe('rainy night beat')
  expect(music.formatDuration(153)).toBe('2:33')
})

it('plays the picked track and remembers it with the volume', () => {
  music.setVolume(0.3)
  music.pick(4)
  expect(play).toHaveBeenCalledTimes(1)
  expect(JSON.parse(localStorage.getItem('drawhl.music')!)).toMatchObject({ index: 4, volume: 0.3 })
})

it('pauses on a break and comes back with the next focus', () => {
  music.toggle()
  music.followTimer('break')
  expect(pause).toHaveBeenCalledTimes(1)
  music.followTimer('focus')
  expect(play).toHaveBeenCalledTimes(2)
})

it('stays quiet after a break when music was off', () => {
  music.followTimer('break')
  music.followTimer('focus')
  expect(play).not.toHaveBeenCalled()
})

it('adds own audio files and plays the first one', () => {
  URL.createObjectURL = vi.fn(() => 'blob:track')
  music.addFiles([
    new File(['x'], 'my mix.mp3', { type: 'audio/mpeg' }),
    new File(['x'], 'notes.txt', { type: 'text/plain' }),
  ])
  expect(play).toHaveBeenCalledTimes(1)
  // An object URL dies with the page, so a built-in track is what gets remembered.
  expect(JSON.parse(localStorage.getItem('drawhl.music')!).index).toBe(0)
})
