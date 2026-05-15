import { app, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { showTimerWindow, hideTimerWindow, isTimerWindowVisible } from '../windows/timerWindow'
import { showSettingsWindow } from '../windows/settingsWindow'

let tray: Tray | null = null

function getIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.png')
  }
  return join(import.meta.dirname, '../../resources/icon.png')
}

function buildContextMenu(): Menu {
  const timerVisible = isTimerWindowVisible()

  return Menu.buildFromTemplate([
    {
      label: timerVisible ? '타이머 숨기기' : '타이머 표시',
      click: () => {
        if (isTimerWindowVisible()) {
          hideTimerWindow()
        } else {
          showTimerWindow()
        }
        updateContextMenu()
      }
    },
    { type: 'separator' },
    {
      label: '설정',
      click: () => showSettingsWindow()
    },
    { type: 'separator' },
    {
      label: '종료',
      role: 'quit'
    }
  ])
}

function updateContextMenu(): void {
  if (tray) {
    tray.setContextMenu(buildContextMenu())
  }
}

export function createAppTray(): void {
  if (tray) return

  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Oh-My-Pomodoro')
  tray.setContextMenu(buildContextMenu())

  tray.on('click', () => {
    if (isTimerWindowVisible()) {
      hideTimerWindow()
    } else {
      showTimerWindow()
    }
    updateContextMenu()
  })
}

export function destroyAppTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export { updateContextMenu as updateTrayMenu }
