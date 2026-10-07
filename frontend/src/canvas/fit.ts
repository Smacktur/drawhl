export const STICKY_FONT = 14
export const STICKY_MAX_CHARS = 2000

const FLOOR = 1
const STEP = 0.25

/** Largest font size up to `max` for which `fits` holds; no practical lower bound. */
export function fitFontSize(fits: (size: number) => boolean, max = STICKY_FONT): number {
  // Most notes fit at full size, so one measurement settles them.
  if (fits(max)) return max
  let low = FLOOR
  let high = max
  while (high - low > STEP) {
    const mid = (low + high) / 2
    if (fits(mid)) low = mid
    else high = mid
  }
  return Math.floor(low / STEP) * STEP
}

/** Whether an edit would push a field past `limit`, counting the selection it replaces. */
export function wouldExceed(
  field: { value: string; selectionStart: number | null; selectionEnd: number | null },
  added: number,
  limit = STICKY_MAX_CHARS,
): boolean {
  const replaced = (field.selectionEnd ?? 0) - (field.selectionStart ?? 0)
  return added > 0 && field.value.length - replaced + added > limit
}
