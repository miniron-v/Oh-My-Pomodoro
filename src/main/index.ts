import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/types'
import { createSettingsWindow, hideSettingsWindow, showSettingsWindow } from './windows/settingsWindow'
import { createTimerWindow, destroyTimerWindow, getTimerWindow } from './windows/timerWindow'
import { createVideoWindow, destroyVideoWindow } from './windows/videoWindow'
import { registerIpcHandlers } from './ipc/handlers'

app.whenReady().then(() => {
  const settingsWindow = createSettingsWindow()
  registerIpcHandlers(settingsWindow)

  ipcMain.on(IPC_CHANNELS.TIMER_START, () => {
    hideSettingsWindow()
    createTimerWindow()
    createVideoWindow()
  })

  ipcMain.on(IPC_CHANNELS.TIMER_STOP, () => {
    destroyTimerWindow()
    destroyVideoWindow()
    showSettingsWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

export { getTimerWindow }
