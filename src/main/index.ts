import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createSettingsWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 520,
    height: 680,
    resizable: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/settings`)
  } else {
    win.loadFile(join(import.meta.dirname, '../renderer/index.html'), {
      hash: '/settings'
    })
  }

  return win
}

app.whenReady().then(() => {
  createSettingsWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
