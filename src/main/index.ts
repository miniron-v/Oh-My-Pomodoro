import { app, ipcMain, Menu } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import { createSettingsWindow, hideSettingsWindow, showSettingsWindow } from './windows/settingsWindow'
import { createTimerWindow, destroyTimerWindow, getTimerWindow } from './windows/timerWindow'
import { createVideoWindow, destroyVideoWindow } from './windows/videoWindow'
import { registerIpcHandlers, addAllowedMediaPath } from './ipc/handlers'
import { registerMediaProtocol } from './protocol/mediaProtocol'
import { startPomodoro, stopPomodoro, pausePomodoro, resumePomodoro, handleVideoEnded, handleVideoSkip } from './timer/PomodoroEngine'
import { getSettings } from './store/settingsStore'

function restoreAllowedMediaPaths(): void {
  const settings = getSettings()
  if (settings.startVideoSource && !settings.startVideoSource.startsWith('http')) {
    addAllowedMediaPath(settings.startVideoSource)
  }
  if (settings.endVideoSource && !settings.endVideoSource.startsWith('http')) {
    addAllowedMediaPath(settings.endVideoSource)
  }
}

app.whenReady().then(() => {
  registerMediaProtocol()
  restoreAllowedMediaPaths()

  const menu = Menu.buildFromTemplate([
    {
      label: '개발',
      submenu: [
        {
          label: '개발자 도구 열기',
          accelerator: 'F12',
          click: (_item, win) => {
            if (win?.webContents.isDevToolsOpened()) {
              win.webContents.closeDevTools()
            } else {
              win?.webContents.openDevTools({ mode: 'detach' })
            }
          }
        },
        { role: 'reload', label: '새로고침' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)

  const settingsWindow = createSettingsWindow()
  registerIpcHandlers(settingsWindow)

  ipcMain.on(IPC_CHANNELS.TIMER_START, () => {
    hideSettingsWindow()
    createTimerWindow()
    createVideoWindow()
    startPomodoro()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_STOP, () => {
    stopPomodoro()
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
