/** Half-open [start, end) ranges of a displayed string to highlight. */
export type Range = [number, number]

const MARKS = /\p{M}/gu

/** Lowercase without accents, so "Ёлка" and "ёлка" and "елка" are the same, and "café" is "cafe". */
export function normalize(text: string) {
  return text.normalize('NFD').replace(MARKS, '').toLowerCase()
}

export function words(query: string) {
  return normalize(query).split(/\s+/).filter(Boolean)
}

const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char)

function startsWord(hay: string, word: string) {
  for (let at = hay.indexOf(word); at !== -1; at = hay.indexOf(word, at + 1)) {
    if (!isWordChar(hay[at - 1])) return true
  }
  return false
}

export type Searchable = {
  /** Normalized text of every searched field, joined with newlines. */
  haystack: string
  /** Normalized task key, matched exactly for the top rank. */
  key?: string
  /** Normalized main text, for the "starts with the query" rank. */
  head: string
}

/**
 * Rank of an entry for the query words, lower is better, or -1 when some word is missing:
 * 0 exact key, 1 text starts with the query, 2 every word starts a word, 3 anywhere.
 */
export function rank(entry: Searchable, query: string[]): number {
  for (const word of query) if (!entry.haystack.includes(word)) return -1
  const phrase = query.join(' ')
  if (entry.key === phrase) return 0
  if (entry.head.startsWith(phrase)) return 1
  if (query.every((word) => startsWord(entry.haystack, word))) return 2
  return 3
}

/** Ranges of `text` that hold any of the query words, merged and in order. */
export function highlight(text: string, query: string[]): Range[] {
  if (query.length === 0 || !text) return []
  // Normalizing per character keeps indexes of the original text for accented letters.
  let flat = ''
  const origin: number[] = []
  for (let i = 0; i < text.length; i++) {
    const part = normalize(text[i])
    flat += part
    for (let k = 0; k < part.length; k++) origin.push(i)
  }
  origin.push(text.length)
  const ranges: Range[] = []
  for (const word of query) {
    for (let at = flat.indexOf(word); at !== -1; at = flat.indexOf(word, at + 1)) {
      ranges.push([origin[at], origin[at + word.length - 1] + 1])
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Range[] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  return merged
}

/** One line of at most `max` characters around the first match, with its highlights. */
export function snippet(text: string, query: string[], max = 80) {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line.length <= max) return { text: line, ranges: highlight(line, query) }
  const first = highlight(line, query)[0]?.[0] ?? 0
  // A little text before the match keeps it readable.
  const start = Math.max(0, Math.min(first - 20, line.length - max))
  const end = start + max
  const cut = `${start > 0 ? '…' : ''}${line.slice(start, end).trim()}${end < line.length ? '…' : ''}`
  return { text: cut, ranges: highlight(cut, query) }
}
