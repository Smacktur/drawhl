const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const UNIT: Record<string, number> = { d: DAY, h: HOUR, m: MINUTE }
// A date without a time goes off at the start of a working day.
const DEFAULT_TIME: [number, number] = [10, 0]

const DURATION = /^(?:in )?((?:\d+ ?(?:d|h|min|m) ?)+|\d+)$/
const DURATION_PART = /(\d+) ?(d|h|min|m)/g
const CLOCK = /^(\d{1,2}):(\d{2})$/
const DOTTED = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?$/
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const PRESETS = [
  { label: '15m', input: '15m' },
  { label: '30m', input: '30m' },
  { label: '1h', input: '1h' },
  { label: '2h', input: '2h' },
  { label: 'Tomorrow 10:00', input: 'tomorrow 10:00' },
]

export const WHEN_HINT = '30m, 2h, tomorrow 10:00, 25.10 15:00'

export type When = { at: number } | { error: string }

/** Reads a duration or a moment typed by the user; null for empty input. */
export function parseWhen(input: string, now: number): When | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null
  const at = parseDuration(text, now) ?? parseMoment(text, now)
  if (at === undefined) return { error: `Could not read this time. Try ${WHEN_HINT}.` }
  if (at <= now) return { error: 'This time has already passed.' }
  return { at }
}

function parseDuration(text: string, now: number) {
  const match = DURATION.exec(text)
  if (!match) return undefined
  // A bare number is minutes, the most common wait.
  if (/^\d+$/.test(match[1])) return now + Number(match[1]) * MINUTE
  let ms = 0
  for (const [, count, unit] of match[1].matchAll(DURATION_PART))
    ms += Number(count) * UNIT[unit[0]]
  return now + ms
}

function parseMoment(text: string, now: number) {
  const parts = text.split(' ')
  const clock = CLOCK.exec(parts.at(-1)!)
  if (clock) parts.pop()
  const [hours, minutes] = clock ? [Number(clock[1]), Number(clock[2])] : DEFAULT_TIME
  if (hours > 23 || minutes > 59) return undefined
  const day = parts.length ? parseDay(parts.join(' '), now) : { date: new Date(now), roll: 1 }
  if (!day) return undefined
  const at = new Date(day.date)
  at.setHours(hours, minutes, 0, 0)
  // A moment that has passed means its next occurrence: tomorrow, next week or next year.
  if (at.getTime() <= now && day.roll) {
    if (day.roll === 'year') at.setFullYear(at.getFullYear() + 1)
    else at.setDate(at.getDate() + day.roll)
  }
  return at.getTime()
}

type Day = { date: Date; roll?: number | 'year' }

function parseDay(text: string, now: number): Day | undefined {
  const today = new Date(now)
  if (text === 'today') return { date: today }
  if (text === 'tomorrow') return { date: shift(today, 1) }
  const weekday = WEEKDAYS.findIndex((name) => text.startsWith(name) && /^[a-z]+$/.test(text))
  if (weekday >= 0) return { date: shift(today, (weekday - today.getDay() + 7) % 7), roll: 7 }
  const dotted = DOTTED.exec(text)
  if (dotted) {
    const year = dotted[3] ? Number(dotted[3].padStart(4, '20')) : today.getFullYear()
    const date = calendar(year, Number(dotted[2]), Number(dotted[1]))
    return date && { date, roll: dotted[3] ? undefined : 'year' }
  }
  const iso = ISO_DATE.exec(text)
  if (iso) {
    const date = calendar(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    return date && { date }
  }
  return undefined
}

function shift(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Date rolls 31.02 over to March; a typo should be an error instead.
function calendar(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

/** Time left in one short unit, for the cube: 45s, 28m, 3h, 2d. */
export function formatLeft(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

/** Time left in words: 45 s, 2 h 5 min, 1 d 3 h, 18 days. */
export function formatLeftLong(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 3 && hours % 24) return `${days} d ${hours % 24} h`
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n: number) => String(n).padStart(2, '0')

// The UI is English whatever the browser locale; the time zone is the user's.
/** The moment as "Sun, 25.10.2026, 15:30". */
export function formatDue(at: number) {
  const d = new Date(at)
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
  return `${WEEKDAY_NAMES[d.getDay()]}, ${date}, ${formatClock(at)}`
}

/** Clock time only, 24-hour: "15:30". */
export function formatClock(at: number) {
  const d = new Date(at)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
