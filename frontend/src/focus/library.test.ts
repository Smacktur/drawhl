import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { listTracks, removeTrack, saveTrack } from './library'

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
