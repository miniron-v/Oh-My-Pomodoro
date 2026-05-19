import { app, ipcMain, Menu, globalShortcut } from 'electron'
import { existsSync } from 'fs'
import { IPC_CHANNELS } from '../shared/types'
import { createSettingsWindow, hideSettingsWindow, showSettingsWindow } from './windows/settingsWindow'
import { createTimerWindow, destroyTimerWindow, getTimerWindow, hideTimerWindow, showTimerWindow } from './windows/timerWindow'
import { createVideoWindow, destroyVideoWindow } from './windows/videoWindow'
import { registerIpcHandlers } from './ipc/handlers'
import { registerMediaProtocol } from './protocol/mediaProtocol'
import { startPomodoro, stopPomodoro, pausePomodoro, resumePomodoro, handleVideoEnded, handleVideoSkip } from './timer/PomodoroEngine'
import { getSettings, setSettings } from './store/settingsStore'
import { addMedia } from './store/mediaStore'
import { createAppTray, destroyAppTray, updateTrayMenu } from './tray/appTray'

function migrateOldMediaPaths(): void {
  const settings = getSettings() as Record<string, unknown>
  const oldStart = settings['startVideoSource'] as string | null | undefined
  const oldEnd = settings['endVideoSource'] as string | null | undefined
  if (oldStart === undefined && oldEnd === undefined) return

  let newStartId = settings['startMediaId'] as string | null ?? null
  let newEndId = settings['endMediaId'] as string | null ?? null

  if (oldStart && typeof oldStart === 'string' && !oldStart.startsWith('http') && existsSync(oldStart)) {
    const entry = addMedia(oldStart)
    if (entry) newStartId = entry.id
  }
  if (oldEnd && typeof oldEnd === 'string' && !oldEnd.startsWith('http') && existsSync(oldEnd)) {
    const entry = addMedia(oldEnd)
    if (entry) newEndId = entry.id
  }

  setSettings({
    mode: (settings['mode'] as 'timer' | 'alarm') ?? 'timer',
    workMinutes: settings['workMinutes'] as number ?? 25,
    shortBreakMinutes: settings['shortBreakMinutes'] as number ?? 5,
    longBreakMinutes: settings['longBreakMinutes'] as number ?? 15,
    longBreakInterval: settings['longBreakInterval'] as number ?? 4,
    alarmWorkMinute: settings['alarmWorkMinute'] as number ?? 0,
    alarmBreakMinute: settings['alarmBreakMinute'] as number ?? 50,
    startMediaId: newStartId,
    endMediaId: newEndId,
    soundMode: (settings['soundMode'] as 'video' | 'alarm') ?? 'video'
  })
}

app.whenReady().then(() => {
  registerMediaProtocol()
  migrateOldMediaPaths()

  Menu.setApplicationMenu(null)

  if (!app.isPackaged) {
    app.on('browser-window-focus', (_event, win) => {
      globalShortcut.register('F12', () => {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools()
        } else {
          win.webContents.openDevTools({ mode: 'detach' })
        }
      })
    })

    app.on('browser-window-blur', () => {
      globalShortcut.unregister('F12')
    })
  }

  const settingsWindow = createSettingsWindow()
  registerIpcHandlers(settingsWindow)

  ipcMain.on(IPC_CHANNELS.TIMER_START, () => {
    hideSettingsWindow()
    createTimerWindow()
    createVideoWindow()
    createAppTray()
    startPomodoro()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_STOP, () => {
    stopPomodoro()
    destroyAppTray()
    destroyTimerWindow()
    destroyVideoWindow()
    showSettingsWindow()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_PAUSE, () => {
    pausePomodoro()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_RESUME, () => {
    resumePomodoro()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_HIDE, () => {
    hideTimerWindow()
    updateTrayMenu()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_SHOW, () => {
    showTimerWindow()
    updateTrayMenu()
  })

  ipcMain.on(IPC_CHANNELS.VIDEO_ENDED, () => {
    handleVideoEnded()
  })

  ipcMain.on(IPC_CHANNELS.VIDEO_SKIP, () => {
    handleVideoSkip()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

export { getTimerWindow }
