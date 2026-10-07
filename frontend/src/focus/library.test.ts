import 'fake-indexeddb/auto'
import { beforeEach, expect, it, vi } from 'vitest'
import { listTracks, protection, removeTrack, saveTrack } from './library'

beforeEach(async () => {
  for (const track of await listTracks()) await removeTrack(track.id)
})

it('keeps tracks in the order they were added', async () => {
  await saveTrack({ id: 'b', title: 'Second', file: new Blob(['2']), added: 2 })
  await saveTrack({ id: 'a', title: 'First', file: new Blob(['1']), added: 1 })
  expect((await listTracks()).map((t) => t.title)).toEqual(['First', 'Second'])
})

it('updates and removes a track', async () => {
  await saveTrack({ id: 'a', title: 'Mix', file: new Blob(['1']), added: 1 })
  await saveTrack({ id: 'a', title: 'Mix', file: new Blob(['1']), added: 1, duration: 90 })
  expect(await listTracks()).toMatchObject([{ id: 'a', duration: 90 }])
  await removeTrack('a')
  expect(await listTracks()).toEqual([])
})

it('asks the browser to protect the files only when told to', async () => {
  const persist = vi.fn(() => Promise.resolve(true))
  vi.stubGlobal('navigator', { storage: { persisted: () => Promise.resolve(false), persist } })
  expect(await protection()).toBe('unprotected')
  expect(persist).not.toHaveBeenCalled()
  expect(await protection(true)).toBe('protected')
  vi.unstubAllGlobals()
})

it('reports no protection where the browser has no storage manager', async () => {
  vi.stubGlobal('navigator', {})
  expect(await protection(true)).toBe('unavailable')
  vi.unstubAllGlobals()
})
