import { BrowserWindow } from 'electron'
import { join } from 'path'

let timerWindow: BrowserWindow | null = null

export function createTimerWindow(): BrowserWindow {
  timerWindow = new BrowserWindow({
    width: 280,
    height: 56,
    minWidth: 100,
    minHeight: 24,
    maxWidth: 560,
    maxHeight: 112,
    resizable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    timerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/timer`)
  } else {
    timerWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'), {
      hash: '/timer'
    })
  }

  timerWindow.webContents.setBackgroundThrottling(false)

  timerWindow.on('closed', () => {
    timerWindow = null
  })

  return timerWindow
}

export function getTimerWindow(): BrowserWindow | null {
  return timerWindow
}

export function hideTimerWindow(): void {
  if (timerWindow) {
    timerWindow.hide()
  }
}

export function showTimerWindow(): void {
  if (timerWindow) {
    timerWindow.show()
    timerWindow.setAlwaysOnTop(true)
  }
}

export function isTimerWindowVisible(): boolean {
  return timerWindow !== null && timerWindow.isVisible()
}

export function destroyTimerWindow(): void {
  if (timerWindow) {
    timerWindow.destroy()
    timerWindow = null
  }
}
