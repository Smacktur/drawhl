/** Calendar days as whole numbers since 1970-01-01, so date math is integer math. */
export type Day = number

export type Scale = 'day' | 'week' | 'month'

export type Cell = { label: string; from: number; span: number; weekend?: boolean }

const MS_PER_DAY = 86_400_000
export const MAX_RANGE_DAYS = 1096

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseDay(iso: string): Day {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / MS_PER_DAY
}

export function formatDay(day: Day): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10)
}

/** The browser's local calendar date: "today" is where the user is, not UTC. */
export function today(now = new Date()): Day {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY
}

function parts(day: Day) {
  const date = new Date(day * MS_PER_DAY)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), date: date.getUTCDate() }
}

const monthStart = (year: number, month: number): Day => Date.UTC(year, month, 1) / MS_PER_DAY

/** Monday is 0. */
function weekday(day: Day) {
  return (day + 3) % 7
}

function isoWeek(day: Day) {
  const thursday = day - weekday(day) + 3
  const { year } = parts(thursday)
  return Math.floor((thursday - Date.UTC(year, 0, 1) / MS_PER_DAY) / 7) + 1
}

function quarterIndex(day: Day) {
  const { year, month } = parts(day)
  return year * 4 + Math.floor(month / 3)
}

function quarterBounds(index: number) {
  const year = Math.floor(index / 4)
  const month = (index % 4) * 3
  return { start: monthStart(year, month), end: monthStart(year, month + 3) - 1 }
}

export function currentQuarter(day: Day) {
  return quarterBounds(quarterIndex(day))
}

/** One calendar quarter more before the quarter the range starts in. */
export function quarterBefore(start: Day): Day {
  return quarterBounds(quarterIndex(start) - 1).start
}

/** One calendar quarter more after the quarter the range ends in. */
export function quarterAfter(end: Day): Day {
  return quarterBounds(quarterIndex(end) + 1).end
}

export function rangeDays(start: Day, end: Day) {
  return end - start + 1
}

export function fitsRange(start: Day, end: Day) {
  return end >= start && end - start <= MAX_RANGE_DAYS
}

/** Splits [start, end] into cells that begin where next(day) says, clipped to the range. */
function cells(start: Day, end: Day, next: (day: Day) => Day, label: (day: Day) => string) {
  const out: Cell[] = []
  let from = start
  while (from <= end) {
    const to = Math.min(next(from), end + 1)
    out.push({ label: label(from), from: from - start, span: to - from })
    from = to
  }
  return out
}

const nextMonth = (day: Day) => {
  const { year, month } = parts(day)
  return monthStart(year, month + 1)
}
const nextQuarter = (day: Day) => quarterBounds(quarterIndex(day) + 1).start

const quarterLabel = (day: Day) => `Q${(quarterIndex(day) % 4) + 1} ${parts(day).year}`
const monthLabel = (day: Day) => `${MONTHS[parts(day).month]} ${parts(day).year}`

/** Two header rows: a coarse one on top and the scale's own units below. */
export function header(start: Day, end: Day, scale: Scale): { top: Cell[]; bottom: Cell[] } {
  if (scale === 'day') {
    return {
      top: cells(start, end, nextMonth, monthLabel),
      bottom: cells(
        start,
        end,
        (day) => day + 1,
        (day) => String(parts(day).date),
      ).map((cell) => ({ ...cell, weekend: weekday(start + cell.from) >= 5 })),
    }
  }
  const top = cells(start, end, nextQuarter, quarterLabel)
  if (scale === 'week') {
    return {
      top,
      bottom: cells(
        start,
        end,
        (day) => day - weekday(day) + 7,
        (day) => `W${isoWeek(day)}`,
      ),
    }
  }
  return { top, bottom: cells(start, end, nextMonth, (day) => MONTHS[parts(day).month]) }
}
