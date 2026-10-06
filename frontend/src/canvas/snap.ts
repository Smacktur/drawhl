export type Box = { x: number; y: number; width: number; height: number }
export type Guide = { kind: 'align' | 'gap'; x1: number; y1: number; x2: number; y2: number }

type Axis = 'x' | 'y'
// null stands for the moving box, whose final place is known only after both axes snap.
type Pair = [Box | null, Box | null]
type Match = { kind: 'align'; at: number; with: Box } | { kind: 'gap'; pairs: Pair[] }
type Candidate = { target: number; dist: number; match: Match }

const cross = (a: Axis): Axis => (a === 'x' ? 'y' : 'x')
const extent = (b: Box, a: Axis) => (a === 'x' ? b.width : b.height)
const lo = (b: Box, a: Axis) => b[a]
const hi = (b: Box, a: Axis) => b[a] + extent(b, a)
const overlaps = (p: Box, q: Box, a: Axis) => lo(p, a) < hi(q, a) && lo(q, a) < hi(p, a)
const point = (a: Axis, along: number, across: number) =>
  a === 'x' ? { x: along, y: across } : { x: across, y: along }

function nearestBefore(box: Box, row: Box[], a: Axis, slack: number) {
  let best: Box | undefined
  for (const o of row) {
    if (hi(o, a) <= lo(box, a) + slack && (!best || hi(o, a) > hi(best, a))) best = o
  }
  return best
}

function nearestAfter(box: Box, row: Box[], a: Axis, slack: number) {
  let best: Box | undefined
  for (const o of row) {
    if (lo(o, a) >= hi(box, a) - slack && (!best || lo(o, a) < lo(best, a))) best = o
  }
  return best
}

function candidates(m: Box, others: Box[], a: Axis, threshold: number): Candidate[] {
  const size = extent(m, a)
  const found: Candidate[] = []
  const add = (target: number, match: Match) =>
    found.push({ target, dist: Math.abs(target - m[a]), match })

  for (const o of others) {
    for (const at of [lo(o, a), lo(o, a) + extent(o, a) / 2, hi(o, a)]) {
      for (const offset of [0, size / 2, size]) add(at - offset, { kind: 'align', at, with: o })
    }
  }

  const c = cross(a)
  const row = others.filter((o) => overlaps(o, m, c))
  const prev = nearestBefore(m, row, a, threshold)
  const next = nearestAfter(m, row, a, threshold)
  if (prev && next) {
    const gap = (lo(next, a) - hi(prev, a) - size) / 2
    if (gap > 0)
      add(hi(prev, a) + gap, {
        kind: 'gap',
        pairs: [
          [prev, null],
          [null, next],
        ],
      })
  }
  if (prev) {
    const before = nearestBefore(
      prev,
      others.filter((o) => o !== prev && overlaps(o, prev, c)),
      a,
      0,
    )
    if (before) {
      const gap = lo(prev, a) - hi(before, a)
      add(hi(prev, a) + gap, {
        kind: 'gap',
        pairs: [
          [before, prev],
          [prev, null],
        ],
      })
    }
  }
  if (next) {
    const after = nearestAfter(
      next,
      others.filter((o) => o !== next && overlaps(o, next, c)),
      a,
      0,
    )
    if (after) {
      const gap = lo(after, a) - hi(next, a)
      add(lo(next, a) - gap - size, {
        kind: 'gap',
        pairs: [
          [null, next],
          [next, after],
        ],
      })
    }
  }
  return found.filter((f) => f.dist <= threshold)
}

// Alignment wins a tie: it is listed first and only a strictly closer match replaces it.
function closest(list: Candidate[]) {
  let best: Candidate | undefined
  for (const c of list) if (!best || c.dist < best.dist) best = c
  return best
}

function draw(match: Match, m: Box, a: Axis): Guide[] {
  const c = cross(a)
  if (match.kind === 'align') {
    const from = point(a, match.at, Math.min(lo(m, c), lo(match.with, c)))
    const to = point(a, match.at, Math.max(hi(m, c), hi(match.with, c)))
    return [{ kind: 'align', x1: from.x, y1: from.y, x2: to.x, y2: to.y }]
  }
  return match.pairs.map(([p, q]) => {
    const left = p ?? m
    const right = q ?? m
    const middle = (Math.max(lo(left, c), lo(right, c)) + Math.min(hi(left, c), hi(right, c))) / 2
    const from = point(a, hi(left, a), middle)
    const to = point(a, lo(right, a), middle)
    return { kind: 'gap', x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  })
}

/** Where a dragged box lands when it snaps to the edges, centers and gaps of the others. */
export function snap(moving: Box, others: Box[], threshold: number) {
  const bx = closest(candidates(moving, others, 'x', threshold))
  const by = closest(candidates(moving, others, 'y', threshold))
  const final = { ...moving, x: bx?.target ?? moving.x, y: by?.target ?? moving.y }
  const guides = [
    ...(bx ? draw(bx.match, final, 'x') : []),
    ...(by ? draw(by.match, final, 'y') : []),
  ]
  return { x: final.x, y: final.y, guides }
}
