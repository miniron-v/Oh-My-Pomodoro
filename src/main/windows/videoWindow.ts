import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

let videoWindow: BrowserWindow | null = null

export function createVideoWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  videoWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    videoWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/video`)
  } else {
    videoWindow.loadFile(join(import.meta.dirname, '../../renderer/index.html'), {
      hash: '/video'
    })
  }

  videoWindow.on('closed', () => {
    videoWindow = null
  })

  return videoWindow
}

export function getVideoWindow(): BrowserWindow | null {
  return videoWindow
}

export function showVideoWindow(): void {
  if (videoWindow) {
    videoWindow.show()
    videoWindow.setAlwaysOnTop(true, 'screen-saver')
  }
}

export function hideVideoWindow(): void {
  if (videoWindow) {
    videoWindow.hide()
  }
}

export function destroyVideoWindow(): void {
  if (videoWindow) {
    videoWindow.destroy()
    videoWindow = null
  }
}
