import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { listTracks, removeTrack } from './library'
import * as music from './music'

const play = vi.fn(() => Promise.resolve())
const pause = vi.fn()

beforeEach(async () => {
  for (const track of await listTracks()) await removeTrack(track.id)
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`)
  URL.revokeObjectURL = vi.fn()
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
  expect(JSON.parse(localStorage.getItem('drawhl.music')!)).toMatchObject({
    current: '/music/families.mp3',
    volume: 0.3,
  })
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

it('keeps own files in the browser and brings them back after a reload', async () => {
  await music.addFiles([
    new File(['x'], 'my mix.mp3', { type: 'audio/mpeg' }),
    new File(['x'], 'notes.txt', { type: 'text/plain' }),
  ])
  expect(play).toHaveBeenCalledTimes(1)
  expect(await listTracks()).toMatchObject([{ title: 'my mix' }])

  music.resetMusic()
  const { result } = renderHook(() => music.useMusic())
  await waitFor(() => expect(result.current.tracks).toHaveLength(8))
  // The own track was playing, so the player comes back on it.
  expect(result.current.tracks[result.current.index]).toMatchObject({ title: 'my mix' })
})

it('removes an own track from the list and the browser', async () => {
  await music.addFiles([new File(['x'], 'one.mp3', { type: 'audio/mpeg' })])
  const [stored] = await listTracks()
  music.removeOwnTrack(stored.id)
  await vi.waitFor(async () => expect(await listTracks()).toEqual([]))
  expect(URL.revokeObjectURL).toHaveBeenCalled()
})
