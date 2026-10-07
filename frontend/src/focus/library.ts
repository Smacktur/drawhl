/** The user's own tracks, kept as files in this browser's IndexedDB; nothing leaves the device. */
export interface StoredTrack {
  id: string
  title: string
  file: Blob
  /** Bytes, stored next to the file so counting usage does not read every file. */
  size?: number
  /** Seconds, when the browser could read it. */
  duration?: number
  added: number
}

const DB = 'drawhl'
const STORE = 'tracks'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = action(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function listTracks(): Promise<StoredTrack[]> {
  const all = await run('readonly', (store) => store.getAll() as IDBRequest<StoredTrack[]>)
  return all.sort((a, b) => a.added - b.added)
}

export async function saveTrack(track: StoredTrack): Promise<void> {
  await run('readwrite', (store) => store.put(track))
}

export async function removeTrack(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id))
}

/** Whether the browser keeps this site's data when disk space runs low. */
export type Protection = 'protected' | 'unprotected' | 'unavailable'

// StorageManager exists only on HTTPS and localhost, so plain HTTP gets 'unavailable'.
export async function protection(ask = false): Promise<Protection> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage
  if (!storage?.persisted) return 'unavailable'
  try {
    if (await storage.persisted()) return 'protected'
    if (ask && storage.persist && (await storage.persist())) return 'protected'
    return 'unprotected'
  } catch {
    return 'unavailable'
  }
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}
