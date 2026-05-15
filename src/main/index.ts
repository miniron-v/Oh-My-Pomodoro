import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import { createSettingsWindow, hideSettingsWindow, showSettingsWindow } from './windows/settingsWindow'
import { createTimerWindow, destroyTimerWindow, getTimerWindow } from './windows/timerWindow'
import { createVideoWindow, destroyVideoWindow } from './windows/videoWindow'
import { registerIpcHandlers } from './ipc/handlers'
import { startPomodoro, stopPomodoro, handleVideoEnded, handleVideoSkip } from './timer/PomodoroEngine'

app.whenReady().then(() => {
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
