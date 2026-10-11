import { toast } from 'sonner'

// Long enough to read a server's answer or a few failed keys.
export const ERROR_MS = 8000

/** For a mutation's `onError`: shows what went wrong as a toast. */
export function toastError(error: Error) {
  toast.error(error.message, { duration: ERROR_MS })
}
