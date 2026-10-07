import 'fake-indexeddb/auto'
import { renderHook } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import * as music from './music'

vi.mock('./library', async (original) => ({
  ...(await original<typeof import('./library')>()),
  saveTrack: () => Promise.reject(new DOMException('full', 'QuotaExceededError')),
}))

it('says which files the browser could not keep and why', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
  URL.createObjectURL = vi.fn(() => 'blob:track')
  await music.addFiles([new File(['x'], 'evening mix.mp3', { type: 'audio/mpeg' })])
  const { result } = renderHook(() => music.useMusic())
  expect(result.current.saveError).toBe(
    "Couldn't keep evening mix: browser storage is full. It plays until you close the tab.",
  )
  expect(result.current.tracks.at(-1)).toMatchObject({ title: 'evening mix', unsaved: true })

  music.removeOwnTrack(result.current.tracks.at(-1)!.id!)
  expect(renderHook(() => music.useMusic()).result.current.saveError).toBeUndefined()
})
