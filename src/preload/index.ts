import { contextBridge, ipcRenderer } from 'electron'
import { ALLOWED_IPC_CHANNELS, IPC_CHANNELS, type IpcChannel } from '../shared/types'

function isAllowedChannel(channel: string): channel is IpcChannel {
  return (ALLOWED_IPC_CHANNELS as readonly string[]).includes(channel)
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  listMedia: () => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_LIST),
  addMedia: () => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_ADD),
  removeMedia: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_REMOVE, id),
  getMediaPath: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_GET_PATH, id),

  startTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_START),
  stopTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_STOP),
  pauseTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_PAUSE),
  resumeTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_RESUME),
  hideTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_HIDE),
  showTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_SHOW),

  onTick: (callback: (remainingSeconds: number) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TIMER_TICK, (_event, remainingSeconds) =>
      callback(remainingSeconds)
    )
  },
  onPhaseChange: (callback: (phase: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TIMER_PHASE_CHANGE, (_event, phase) => callback(phase))
  },
  onPaused: (callback: (paused: boolean) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TIMER_PAUSED, (_event, paused) => callback(paused))
  },

  onPlayVideo: (callback: (source: string, soundMode: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.VIDEO_PLAY, (_event, source, soundMode) =>
      callback(source, soundMode)
    )
  },
  notifyVideoEnded: () => ipcRenderer.send(IPC_CHANNELS.VIDEO_ENDED),
  notifyVideoSkip: () => ipcRenderer.send(IPC_CHANNELS.VIDEO_SKIP),
  readMediaFile: (source: string) => ipcRenderer.invoke(IPC_CHANNELS.MEDIA_READ_FILE, source),

  removeAllListeners: (channel: string) => {
    if (isAllowedChannel(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  }
})
