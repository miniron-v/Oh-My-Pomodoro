import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types'
import { getSettings, setSettings } from '../store/settingsStore'
import type { AppSettings } from '../../shared/types'

const allowedMediaPaths: Set<string> = new Set()

export function getAllowedMediaPaths(): ReadonlySet<string> {
  return allowedMediaPaths
}

function isValidSettings(value: unknown): value is AppSettings {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    typeof s.workMinutes === 'number' &&
    typeof s.shortBreakMinutes === 'number' &&
    typeof s.longBreakMinutes === 'number' &&
    typeof s.longBreakInterval === 'number' &&
    (typeof s.startVideoSource === 'string' || s.startVideoSource === null) &&
    (typeof s.endVideoSource === 'string' || s.endVideoSource === null) &&
    (s.soundMode === 'video' || s.soundMode === 'alarm')
  )
}

function isAllowedUrl(source: string): boolean {
  return source.startsWith('https://') || source.startsWith('http://')
}

function validateMediaSource(source: string | null): boolean {
  if (source === null) return true
  if (isAllowedUrl(source)) return true
  if (allowedMediaPaths.has(source)) return true
  return false
}

export function registerIpcHandlers(_settingsWindow: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: unknown) => {
    if (!isValidSettings(settings)) {
      throw new Error('Invalid settings format')
    }
    if (!validateMediaSource(settings.startVideoSource)) {
      throw new Error('Unauthorized media source: startVideoSource')
    }
    if (!validateMediaSource(settings.endVideoSource)) {
      throw new Error('Unauthorized media source: endVideoSource')
    }
    setSettings(settings)
  })

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SELECT_FILE,
    async (_event, filters: Electron.FileFilter[]) => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters
      })
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      const filePath = result.filePaths[0]
      allowedMediaPaths.add(filePath)
      return filePath
    }
  )
}
