import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { getTimerWindowState, saveTimerWindowState, flushTimerWindowState } from '../store/windowStateStore'

let timerWindow: BrowserWindow | null = null

function clampToScreen(x: number, y: number, width: number, height: number): { x: number; y: number } {
  const displays = screen.getAllDisplays()
  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.workArea
    if (x >= dx && x + width <= dx + dw && y >= dy && y + height <= dy + dh) {
      return { x, y }
    }
  }
  const primary = screen.getPrimaryDisplay().workArea
  return { x: primary.x + 50, y: primary.y + 50 }
}

export function createTimerWindow(): BrowserWindow {
  const saved = getTimerWindowState()
  const usePosition = saved.x >= 0 && saved.y >= 0
  const pos = usePosition
    ? clampToScreen(saved.x, saved.y, saved.width, saved.height)
    : { x: undefined as number | undefined, y: undefined as number | undefined }

  timerWindow = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: pos.x,
    y: pos.y,
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
    show: !saved.hidden,
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

  timerWindow.on('move', () => {
    if (!timerWindow) return
    const [x, y] = timerWindow.getPosition()
    saveTimerWindowState({ x, y })
  })

  timerWindow.on('resize', () => {
    if (!timerWindow) return
    const [width, height] = timerWindow.getSize()
    saveTimerWindowState({ width, height })
  })

  timerWindow.on('closed', () => {
    flushTimerWindowState()
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
    saveTimerWindowState({ hidden: true })
  }
}

export function showTimerWindow(): void {
  if (timerWindow) {
    timerWindow.show()
    timerWindow.setAlwaysOnTop(true)
    saveTimerWindowState({ hidden: false })
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
