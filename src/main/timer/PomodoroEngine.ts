import { type TimerPhase, type AppSettings, IPC_CHANNELS } from '../../shared/types'
import { getSettings } from '../store/settingsStore'
import { getTimerWindow } from '../windows/timerWindow'
import { getVideoWindow, showVideoWindow, hideVideoWindow } from '../windows/videoWindow'

const MEDIA_MAX_SECONDS = 5
const TICK_INTERVAL_MS = 250

interface EngineState {
  phase: TimerPhase
  remainingSeconds: number
  completedWorkSessions: number
  nextPhaseAfterVideo: Exclude<TimerPhase, 'idle' | 'video-playing'> | null
}

let state: EngineState = {
  phase: 'idle',
  remainingSeconds: 0,
  completedWorkSessions: 0,
  nextPhaseAfterVideo: null
}

let tickTimer: ReturnType<typeof setInterval> | null = null
let targetEndTime: number | null = null
let mediaTimer: ReturnType<typeof setTimeout> | null = null
let paused = false

function broadcastTick(): void {
  const timerWin = getTimerWindow()
  if (timerWin && !timerWin.isDestroyed()) {
    timerWin.webContents.send(IPC_CHANNELS.TIMER_TICK, state.remainingSeconds)
  }
}

function broadcastPhaseChange(): void {
  const timerWin = getTimerWindow()
  if (timerWin && !timerWin.isDestroyed()) {
    timerWin.webContents.send(IPC_CHANNELS.TIMER_PHASE_CHANGE, state.phase)
  }
}

function broadcastPaused(): void {
  const timerWin = getTimerWindow()
  if (timerWin && !timerWin.isDestroyed()) {
    timerWin.webContents.send(IPC_CHANNELS.TIMER_PAUSED, paused)
  }
}

function getPhaseSeconds(phase: TimerPhase, settings: AppSettings): number {
  switch (phase) {
    case 'work':
      return settings.workMinutes * 60
    case 'short-break':
      return settings.shortBreakMinutes * 60
    case 'long-break':
      return settings.longBreakMinutes * 60
    default:
      return 0
  }
}

function startCountdown(seconds: number): void {
  stopCountdown()
  state.remainingSeconds = seconds
  targetEndTime = Date.now() + seconds * 1000
  broadcastTick()

  tickTimer = setInterval(() => {
    if (targetEndTime === null) return
    const remaining = Math.ceil((targetEndTime - Date.now()) / 1000)
    state.remainingSeconds = Math.max(0, remaining)
    broadcastTick()

    if (state.remainingSeconds <= 0) {
      stopCountdown()
      onPhaseTimerEnd()
    }
  }, TICK_INTERVAL_MS)
}

function stopCountdown(): void {
  if (tickTimer !== null) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  targetEndTime = null
}

function clearMediaTimer(): void {
  if (mediaTimer !== null) {
    clearTimeout(mediaTimer)
    mediaTimer = null
  }
}

function onPhaseTimerEnd(): void {
  const settings = getSettings()

  if (state.phase === 'work') {
    state.completedWorkSessions++
    const isLongBreak = state.completedWorkSessions % settings.longBreakInterval === 0
    state.nextPhaseAfterVideo = isLongBreak ? 'long-break' : 'short-break'
    playTransitionVideo(settings.endVideoSource, settings.soundMode)
  } else if (state.phase === 'short-break' || state.phase === 'long-break') {
    state.nextPhaseAfterVideo = 'work'
    playTransitionVideo(settings.startVideoSource, settings.soundMode)
  }
}

function playTransitionVideo(source: string | null, soundMode: string): void {
  if (!source) {
    onVideoComplete()
    return
  }

  state.phase = 'video-playing'
  broadcastPhaseChange()

  const videoWin = getVideoWindow()
  if (videoWin && !videoWin.isDestroyed()) {
    videoWin.webContents.send(IPC_CHANNELS.VIDEO_PLAY, source, soundMode)
    showVideoWindow()
  }

  clearMediaTimer()
  mediaTimer = setTimeout(() => {
    onVideoComplete()
  }, MEDIA_MAX_SECONDS * 1000)
}

function onVideoComplete(): void {
  clearMediaTimer()
  hideVideoWindow()

  if (state.nextPhaseAfterVideo === null) {
    state.phase = 'idle'
    broadcastPhaseChange()
    return
  }

  const nextPhase = state.nextPhaseAfterVideo
  state.nextPhaseAfterVideo = null
  state.phase = nextPhase
  broadcastPhaseChange()

  const settings = getSettings()
  const seconds = getPhaseSeconds(nextPhase, settings)
  startCountdown(seconds)
}

export function startPomodoro(): void {
  const settings = getSettings()
  paused = false
  state = {
    phase: 'work',
    remainingSeconds: 0,
    completedWorkSessions: 0,
    nextPhaseAfterVideo: null
  }
  broadcastPhaseChange()
  broadcastPaused()
  startCountdown(getPhaseSeconds('work', settings))
}

export function stopPomodoro(): void {
  stopCountdown()
  clearMediaTimer()
  hideVideoWindow()
  paused = false
  state = {
    phase: 'idle',
    remainingSeconds: 0,
    completedWorkSessions: 0,
    nextPhaseAfterVideo: null
  }
  broadcastPhaseChange()
  broadcastPaused()
}

export function pausePomodoro(): void {
  if (paused || state.phase === 'idle' || state.phase === 'video-playing') return
  paused = true
  stopCountdown()
  broadcastPaused()
}

export function resumePomodoro(): void {
  if (!paused || state.phase === 'idle' || state.phase === 'video-playing') return
  paused = false
  startCountdown(state.remainingSeconds)
  broadcastPaused()
}

export function handleVideoEnded(): void {
  if (state.phase === 'video-playing') {
    onVideoComplete()
  }
}

export function handleVideoSkip(): void {
  if (state.phase === 'video-playing') {
    onVideoComplete()
  }
}

export function getEngineState(): EngineState {
  return { ...state }
}
