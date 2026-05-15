import { contextBridge, ipcRenderer } from 'electron'
import { ALLOWED_IPC_CHANNELS, IPC_CHANNELS, type IpcChannel } from '../shared/types'

function isAllowedChannel(channel: string): channel is IpcChannel {
  return (ALLOWED_IPC_CHANNELS as readonly string[]).includes(channel)
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  selectFile: (filters: Electron.FileFilter[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_FILE, filters),

  startTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_START),
  stopTimer: () => ipcRenderer.send(IPC_CHANNELS.TIMER_STOP),

  onTick: (callback: (remainingSeconds: number) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TIMER_TICK, (_event, remainingSeconds) =>
      callback(remainingSeconds)
    )
  },
  onPhaseChange: (callback: (phase: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.TIMER_PHASE_CHANGE, (_event, phase) => callback(phase))
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
