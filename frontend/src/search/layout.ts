// The same keys on the US and the Russian layouts, in keyboard order.
const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./"
const RU = 'ёйцукенгшщзхъфывапролджэячсмитьбю.'

const toRu = new Map([...EN].map((char, i) => [char, RU[i]]))
const toEn = new Map([...RU].map((char, i) => [char, EN[i]]))

/** The query as if typed on the other layout: "вузднщ" → "deploy", "ping" → "зштп". */
export function otherLayout(query: string): string | null {
  const lower = query.toLowerCase()
  const map = /[а-яё]/.test(lower) ? toEn : /[a-z]/.test(lower) ? toRu : null
  if (!map) return null
  return [...lower].map((char) => map.get(char) ?? char).join('')
}
