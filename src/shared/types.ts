export type TimerPhase = 'idle' | 'work' | 'short-break' | 'long-break' | 'video-playing'

export interface TimerState {
  phase: TimerPhase
  remainingSeconds: number
  completedWorkSessions: number
  nextPhaseAfterVideo: Exclude<TimerPhase, 'idle' | 'video-playing'> | null
}

export interface AppSettings {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakInterval: number
  startVideoSource: string | null
  endVideoSource: string | null
  soundMode: 'video' | 'alarm'
}

export const DEFAULT_SETTINGS: AppSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  startVideoSource: null,
  endVideoSource: null,
  soundMode: 'video'
}

export const IPC_CHANNELS = {
  TIMER_START: 'timer:start',
  TIMER_STOP: 'timer:stop',
  TIMER_PAUSE: 'timer:pause',
  TIMER_RESUME: 'timer:resume',
  TIMER_TICK: 'timer:tick',
  TIMER_PHASE_CHANGE: 'timer:phase-change',
  TIMER_PAUSED: 'timer:paused',
  VIDEO_PLAY: 'video:play',
  VIDEO_ENDED: 'video:ended',
  VIDEO_SKIP: 'video:skip',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_FILE: 'settings:select-file',
  MEDIA_READ_FILE: 'media:read-file'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

export const ALLOWED_IPC_CHANNELS: readonly IpcChannel[] = Object.values(IPC_CHANNELS)

export interface ElectronAPI {
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: AppSettings) => Promise<void>
  selectFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>

  startTimer: () => void
  stopTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void

  onTick: (callback: (remainingSeconds: number) => void) => void
  onPhaseChange: (callback: (phase: TimerPhase) => void) => void
  onPaused: (callback: (paused: boolean) => void) => void

  onPlayVideo: (callback: (source: string, soundMode: string) => void) => void
  notifyVideoEnded: () => void
  notifyVideoSkip: () => void
  readMediaFile: (source: string) => Promise<ArrayBuffer>

  removeAllListeners: (channel: IpcChannel) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
