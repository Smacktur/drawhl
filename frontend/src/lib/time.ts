const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 days ago", "yesterday", "just now"; null when the date is missing or unparsable. */
export function relativeTime(iso: string | null, now = Date.now()): string | null {
  const time = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(time)) return null
  const seconds = (time - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
