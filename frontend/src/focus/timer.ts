export type Phase = 'focus' | 'short' | 'long'
export type Status = 'idle' | 'running' | 'paused' | 'finished'

/** What the capsule shows: one look per state. */
export type Mode = 'idle' | 'focus' | 'break' | 'paused' | 'done' | 'rested'

export interface TimerSettings {
  focus: number
  short: number
  long: number
  rounds: number
  sound: boolean
  notify: boolean
  autoStart: boolean
}

export interface TimerState {
  phase: Phase
  status: Status
  /** Epoch ms when a running phase ends; null otherwise. */
  endsAt: number | null
  /** Ms left while idle, paused or finished. */
  left: number
  /** Focus round within the cycle, 1..rounds. */
  round: number
}

export const DEFAULT_SETTINGS: TimerSettings = {
  focus: 25,
  short: 5,
  long: 15,
  rounds: 4,
  sound: true,
  notify: true,
  autoStart: false,
}

export const LIMITS = {
  focus: [1, 90],
  short: [1, 60],
  long: [1, 60],
  rounds: [2, 8],
} as const

const MINUTE = 60_000

const clamp = (value: number, [min, max]: readonly [number, number]) =>
  Math.min(max, Math.max(min, Math.round(value)))

export function normalizeSettings(raw: Partial<TimerSettings>): TimerSettings {
  const s = { ...DEFAULT_SETTINGS, ...raw }
  return {
    focus: clamp(s.focus, LIMITS.focus),
    short: clamp(s.short, LIMITS.short),
    long: clamp(s.long, LIMITS.long),
    rounds: clamp(s.rounds, LIMITS.rounds),
    sound: Boolean(s.sound),
    notify: Boolean(s.notify),
    autoStart: Boolean(s.autoStart),
  }
}

export function duration(settings: TimerSettings, phase: Phase): number {
  return settings[phase] * MINUTE
}

export function initialState(settings: TimerSettings): TimerState {
  return {
    phase: 'focus',
    status: 'idle',
    endsAt: null,
    left: duration(settings, 'focus'),
    round: 1,
  }
}

export function nextPhase(
  state: TimerState,
  settings: TimerSettings,
): Pick<TimerState, 'phase' | 'round'> {
  if (state.phase === 'focus')
    return { phase: state.round >= settings.rounds ? 'long' : 'short', round: state.round }
  return { phase: 'focus', round: state.phase === 'long' ? 1 : state.round + 1 }
}

function run(
  phase: Pick<TimerState, 'phase' | 'round'>,
  settings: TimerSettings,
  now: number,
): TimerState {
  return { ...phase, status: 'running', endsAt: now + duration(settings, phase.phase), left: 0 }
}

/** Play: starts an idle phase, resumes a paused one, or moves on from a finished one. */
export function play(state: TimerState, settings: TimerSettings, now: number): TimerState {
  if (state.status === 'running') return state
  if (state.status === 'finished') return run(nextPhase(state, settings), settings, now)
  return { ...state, status: 'running', endsAt: now + state.left, left: 0 }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running' || state.endsAt === null) return state
  return { ...state, status: 'paused', endsAt: null, left: Math.max(0, state.endsAt - now) }
}

/** Skip: the next phase waits for play. */
export function skip(state: TimerState, settings: TimerSettings): TimerState {
  const next = nextPhase(state, settings)
  return { ...next, status: 'idle', endsAt: null, left: duration(settings, next.phase) }
}

export function reset(settings: TimerSettings): TimerState {
  return initialState(settings)
}

/** New settings show at once on an idle phase; a started phase keeps its length. */
export function applySettings(state: TimerState, settings: TimerSettings): TimerState {
  const round = Math.min(state.round, settings.rounds)
  if (state.status !== 'idle') return { ...state, round }
  return { ...state, round, left: duration(settings, state.phase) }
}

/** Ends a running phase whose time is up; `ended` is the phase that just ended. */
export function tick(
  state: TimerState,
  settings: TimerSettings,
  now: number,
): { state: TimerState; ended: Phase | null } {
  if (state.status !== 'running' || state.endsAt === null || now < state.endsAt)
    return { state, ended: null }
  if (settings.autoStart)
    return { state: run(nextPhase(state, settings), settings, now), ended: state.phase }
  return { state: { ...state, status: 'finished', endsAt: null, left: 0 }, ended: state.phase }
}

export interface TimerView {
  mode: Mode
  remaining: number
  /** 0..1 of the current phase. */
  progress: number
  /** Focus rounds finished in this cycle. */
  done: number
}

export function view(state: TimerState, settings: TimerSettings, now: number): TimerView {
  const total = duration(settings, state.phase)
  const remaining =
    state.status === 'running' && state.endsAt !== null
      ? Math.max(0, state.endsAt - now)
      : state.left
  const progress = Math.min(1, Math.max(0, 1 - remaining / total))
  const isFocus = state.phase === 'focus'
  const mode: Mode =
    state.status === 'idle'
      ? 'idle'
      : state.status === 'paused'
        ? 'paused'
        : state.status === 'finished'
          ? isFocus
            ? 'done'
            : 'rested'
          : isFocus
            ? 'focus'
            : 'break'
  const done = state.round - (isFocus && state.status !== 'finished' ? 1 : 0)
  return { mode, remaining, progress, done }
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const PHASE_NAMES: Record<Phase, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}

export function describe(state: TimerState, settings: TimerSettings, mode: Mode): string {
  const round = `round ${state.round} of ${settings.rounds}`
  const phase = PHASE_NAMES[state.phase]
  switch (mode) {
    case 'idle':
      return state.phase === 'focus' ? `Ready to focus · ${round}` : `Ready: ${phase.toLowerCase()}`
    case 'focus':
      return `Focus · ${round}`
    case 'break':
      return phase
    case 'paused':
      return `Paused: ${phase.toLowerCase()} · ${round}`
    case 'done':
      return `Focus done · take a ${state.round >= settings.rounds ? 'long' : 'short'} break`
    case 'rested':
      return 'Break over · start the next focus'
  }
}
