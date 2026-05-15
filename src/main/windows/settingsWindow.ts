import { BrowserWindow } from 'electron'
import { join } from 'path'

let settingsWindow: BrowserWindow | null = null

export function createSettingsWindow(): BrowserWindow {
  settingsWindow = new BrowserWindow({
    width: 800,
    height: 680,
    minWidth: 360,
    minHeight: 500,
    resizable: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/settings`)
  } else {
    settingsWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'), {
      hash: '/settings'
    })
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  return settingsWindow
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow
}

export function showSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.show()
    settingsWindow.focus()
  }
}

export function hideSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.hide()
  }
}
