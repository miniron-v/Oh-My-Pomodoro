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
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    videoWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/video`)
  } else {
    videoWindow.loadFile(join(import.meta.dirname, '../renderer/index.html'), {
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
    videoWindow.setIgnoreMouseEvents(false)
    videoWindow.setOpacity(1)
    videoWindow.setFullScreen(true)
    videoWindow.show()
    videoWindow.focus()
    videoWindow.setAlwaysOnTop(true, 'screen-saver')
  }
}

export function hideVideoWindow(): void {
  if (videoWindow) {
    videoWindow.setFullScreen(false)
    videoWindow.setOpacity(0)
    videoWindow.setIgnoreMouseEvents(true)
  }
}

export function destroyVideoWindow(): void {
  if (videoWindow) {
    videoWindow.destroy()
    videoWindow = null
  }
}
