/** What the query expects at the cursor, and the partial token being typed there. */
export type JqlContext = {
  kind: 'field' | 'operator' | 'value' | 'keyword' | 'none'
  /** Text typed so far for the current token; replaced when a suggestion is applied. */
  token: string
  start: number
  end: number
  /** Field of the current condition, for operators and values. */
  field?: string
  /** Operator of the current condition, for values. */
  operator?: string
  /** Keywords that fit here, for kind "keyword". */
  keywords?: string[]
  /** True when nothing came before the token: the input may still be issue keys. */
  first: boolean
}

type Token = { text: string; start: number; end: number; kind: 'word' | 'string' | 'op' | 'punct' }

const OPERATOR_CHARS = /[=!~<>]/
const BREAK = /[\s=!~<>(),"]/
const WORD_OPERATORS = new Set(['is', 'in', 'not', 'was', 'changed'])

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < text.length) {
    const start = i
    const char = text[i]
    if (/\s/.test(char)) {
      i++
      continue
    }
    if (char === '"' || char === "'") {
      i++
      while (i < text.length && text[i] !== char) i += text[i] === '\\' ? 2 : 1
      i = Math.min(i + 1, text.length)
      tokens.push({ text: text.slice(start, i), start, end: i, kind: 'string' })
    } else if (OPERATOR_CHARS.test(char)) {
      while (i < text.length && OPERATOR_CHARS.test(text[i])) i++
      tokens.push({ text: text.slice(start, i), start, end: i, kind: 'op' })
    } else if ('(),'.includes(char)) {
      i++
      tokens.push({ text: char, start, end: i, kind: 'punct' })
    } else {
      while (i < text.length && !BREAK.test(text[i])) i++
      // A function call like currentUser() or startOfWeek(-1) is one value.
      if (text[i] === '(') {
        const close = text.indexOf(')', i)
        i = close === -1 ? text.length : close + 1
      }
      tokens.push({ text: text.slice(start, i), start, end: i, kind: 'word' })
    }
  }
  return tokens
}

type State =
  'field' | 'operator' | 'value' | 'listNext' | 'after' | 'orderBy' | 'orderField' | 'orderAfter'

/** Walks the tokens before the cursor through a small JQL state machine. */
export function jqlContext(text: string, cursor: number): JqlContext {
  const tokens = tokenize(text.slice(0, cursor))
  const last = tokens.at(-1)
  // A token touching the cursor is still being typed, unless it is complete punctuation.
  const typing = last && last.end === cursor && last.kind !== 'punct' ? last : undefined
  const before = typing ? tokens.slice(0, -1) : tokens

  let state: State = 'field'
  let field: string | undefined
  let operator = ''
  let inList = false
  for (const token of before) {
    const lower = token.text.toLowerCase()
    switch (state) {
      case 'field':
        if (token.text === '(' || lower === 'not') break
        if (lower === 'order') state = 'orderBy'
        else {
          field = token.text
          operator = ''
          state = 'operator'
        }
        break
      case 'operator':
        if (token.kind === 'op') {
          operator = token.text
          state = 'value'
        } else if (WORD_OPERATORS.has(lower)) {
          operator = operator ? `${operator} ${lower}` : lower
          if (lower === 'in') state = 'value'
          if (lower === 'changed') state = 'after'
        } else if (operator) {
          // "is" or "was" followed by a value, e.g. "is EMPTY".
          state = 'after'
        } else state = 'after'
        break
      case 'value':
        if (token.text === '(') inList = true
        else state = inList ? 'listNext' : 'after'
        break
      case 'listNext':
        if (token.text === ',') state = 'value'
        else if (token.text === ')') {
          inList = false
          state = 'after'
        }
        break
      case 'after':
        if (lower === 'and' || lower === 'or') state = 'field'
        else if (lower === 'order') state = 'orderBy'
        else if (token.text === ')') state = 'after'
        break
      case 'orderBy':
        if (lower === 'by') state = 'orderField'
        break
      case 'orderField':
        state = 'orderAfter'
        break
      case 'orderAfter':
        if (token.text === ',') state = 'orderField'
        break
    }
  }

  const start = typing?.start ?? cursor
  // Replace the whole token under the cursor, including what follows it.
  const rest = text.slice(cursor).match(/^[^\s=!~<>(),]*/)?.[0] ?? ''
  const base = {
    token: typing?.text ?? '',
    start,
    end: cursor + rest.length,
    first: before.length === 0,
  }

  // "status is" may go on with "not", or straight to a value.
  if (state === 'operator' && operator) return { ...base, kind: 'value', field, operator }
  switch (state) {
    case 'field':
    case 'orderField':
      return { ...base, kind: 'field' }
    case 'operator':
      return { ...base, kind: 'operator', field }
    case 'value':
      return { ...base, kind: 'value', field, operator }
    case 'after':
      return { ...base, kind: 'keyword', keywords: ['AND', 'OR', 'ORDER BY'] }
    case 'orderBy':
      return { ...base, kind: 'keyword', keywords: ['BY'] }
    case 'orderAfter':
      return { ...base, kind: 'keyword', keywords: ['ASC', 'DESC'] }
    default:
      return { ...base, kind: 'none' }
  }
}

/** Puts the suggestion in place of the current token and moves the cursor past it. */
export function applySuggestion(text: string, context: JqlContext, insert: string) {
  const after = text.slice(context.end)
  const spacer = after.startsWith(' ') ? '' : ' '
  const next = `${text.slice(0, context.start)}${insert}${spacer}${after}`
  return { text: next, cursor: context.start + insert.length + 1 }
}

/** Case-insensitive match: exact, then prefix, then anywhere; shorter first within each. */
export function rank<T>(items: T[], token: string, key: (item: T) => string, limit = 8): T[] {
  const needle = token.replace(/^["']/, '').toLowerCase()
  if (!needle) return items.slice(0, limit)
  const scored = items
    .map((item) => {
      const text = key(item).replace(/^"/, '').toLowerCase()
      const at = text.indexOf(needle)
      const word = text.split(/[\s"]/)[0]
      return { item, score: word === needle ? 0 : at === 0 ? 1 : 2, at, length: text.length }
    })
    .filter(({ at }) => at !== -1)
  scored.sort((a, b) => a.score - b.score || a.length - b.length)
  return scored.slice(0, limit).map(({ item }) => item)
}
