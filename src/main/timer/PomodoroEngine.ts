import { type TimerPhase, type AppSettings, type PomodoroMode, IPC_CHANNELS } from '../../shared/types'
import { getSettings } from '../store/settingsStore'
import { getMediaStoredPath } from '../store/mediaStore'
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

let activeMode: PomodoroMode = 'timer'

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

function resolveMediaPath(mediaId: string | null): string | null {
  if (!mediaId) return null
  return getMediaStoredPath(mediaId)
}

// --- 알람 모드 유틸 ---

function getAlarmCurrentPhase(now: Date, workMin: number, breakMin: number): 'work' | 'short-break' {
  const currentMinute = now.getMinutes()

  if (workMin < breakMin) {
    return (currentMinute >= workMin && currentMinute < breakMin) ? 'work' : 'short-break'
  }
  // workMin > breakMin (예: work=50, break=10)
  return (currentMinute >= breakMin && currentMinute < workMin) ? 'short-break' : 'work'
}

function getSecondsUntilMinute(now: Date, targetMinute: number): number {
  const currentMinute = now.getMinutes()
  const currentSecond = now.getSeconds()

  let diffMinutes = targetMinute - currentMinute
  if (diffMinutes <= 0) diffMinutes += 60

  return diffMinutes * 60 - currentSecond
}

function getAlarmNextEvent(now: Date, workMin: number, breakMin: number): { nextPhase: 'work' | 'short-break'; seconds: number } {
  const currentPhase = getAlarmCurrentPhase(now, workMin, breakMin)

  if (currentPhase === 'work') {
    return { nextPhase: 'short-break', seconds: getSecondsUntilMinute(now, breakMin) }
  }
  return { nextPhase: 'work', seconds: getSecondsUntilMinute(now, workMin) }
}

function startAlarmCountdown(): void {
  const settings = getSettings()
  const now = new Date()
  const { nextPhase, seconds } = getAlarmNextEvent(now, settings.alarmWorkMinute, settings.alarmBreakMinute)

  state.nextPhaseAfterVideo = null
  startCountdown(seconds)

  // nextPhase는 "다음에 올 상태" → 현재 상태는 그 반대
  if (nextPhase === 'short-break') {
    state.phase = 'work'
  } else {
    state.phase = 'short-break'
  }
  broadcastPhaseChange()
}

// --- 공통 전환 로직 ---

function onPhaseTimerEnd(): void {
  const settings = getSettings()

  if (activeMode === 'alarm') {
    onAlarmPhaseTimerEnd(settings)
    return
  }

  if (state.phase === 'work') {
    state.completedWorkSessions++
    const isLongBreak = state.completedWorkSessions % settings.longBreakInterval === 0
    state.nextPhaseAfterVideo = isLongBreak ? 'long-break' : 'short-break'
    playTransitionVideo(resolveMediaPath(settings.endMediaId), settings.soundMode)
  } else if (state.phase === 'short-break' || state.phase === 'long-break') {
    state.nextPhaseAfterVideo = 'work'
    playTransitionVideo(resolveMediaPath(settings.startMediaId), settings.soundMode)
  }
}

function onAlarmPhaseTimerEnd(settings: AppSettings): void {
  if (state.phase === 'work') {
    state.nextPhaseAfterVideo = 'short-break'
    playTransitionVideo(resolveMediaPath(settings.endMediaId), settings.soundMode)
  } else if (state.phase === 'short-break') {
    state.nextPhaseAfterVideo = 'work'
    playTransitionVideo(resolveMediaPath(settings.startMediaId), settings.soundMode)
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

  if (activeMode === 'alarm') {
    // 영상 재생 후 실제 시각 기준으로 다음 이벤트까지 재계산
    const settings = getSettings()
    const now = new Date()
    const { seconds } = getAlarmNextEvent(now, settings.alarmWorkMinute, settings.alarmBreakMinute)
    startCountdown(seconds)
    return
  }

  const settings = getSettings()
  const seconds = getPhaseSeconds(nextPhase, settings)
  startCountdown(seconds)
}

export function startPomodoro(): void {
  const settings = getSettings()
  paused = false
  activeMode = settings.mode

  state = {
    phase: 'idle',
    remainingSeconds: 0,
    completedWorkSessions: 0,
    nextPhaseAfterVideo: null
  }

  if (activeMode === 'alarm') {
    startAlarmCountdown()
  } else {
    state.phase = 'work'
    broadcastPhaseChange()
    broadcastPaused()
    startCountdown(getPhaseSeconds('work', settings))
  }

  broadcastPaused()
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

  if (activeMode === 'alarm') {
    // 재개 시 실제 시각 기준으로 phase + 남은 시간 재계산
    const settings = getSettings()
    const now = new Date()
    const currentPhase = getAlarmCurrentPhase(now, settings.alarmWorkMinute, settings.alarmBreakMinute)
    if (state.phase !== currentPhase) {
      state.phase = currentPhase
      broadcastPhaseChange()
    }
    const { seconds } = getAlarmNextEvent(now, settings.alarmWorkMinute, settings.alarmBreakMinute)
    startCountdown(seconds)
  } else {
    startCountdown(state.remainingSeconds)
  }

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
