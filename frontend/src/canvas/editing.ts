// Nodes created from a tool start in edit mode; the flag is consumed on first render.
const fresh = new Set<string>()

export function markFresh(id: string) {
  fresh.add(id)
}

export function takeFresh(id: string) {
  return fresh.delete(id)
}
