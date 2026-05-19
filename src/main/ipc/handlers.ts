import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { readFileSync } from 'fs'
import { normalize } from 'path'
import { IPC_CHANNELS } from '../../shared/types'
import { getSettings, setSettings } from '../store/settingsStore'
import { listMedia, addMedia, removeMedia, getMediaStoredPath, getMediaDir } from '../store/mediaStore'
import type { AppSettings } from '../../shared/types'

const MEDIA_FILTERS: Electron.FileFilter[] = [
  { name: 'Media', extensions: ['mp4', 'webm', 'gif', 'apng', 'mov', 'avi'] }
]

function isValidSettings(value: unknown): value is AppSettings {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>
  return (
    (s.mode === 'timer' || s.mode === 'alarm') &&
    typeof s.workMinutes === 'number' &&
    typeof s.shortBreakMinutes === 'number' &&
    typeof s.longBreakMinutes === 'number' &&
    typeof s.longBreakInterval === 'number' &&
    typeof s.alarmWorkMinute === 'number' &&
    typeof s.alarmBreakMinute === 'number' &&
    (typeof s.startMediaId === 'string' || s.startMediaId === null) &&
    (typeof s.endMediaId === 'string' || s.endMediaId === null) &&
    (s.soundMode === 'video' || s.soundMode === 'alarm')
  )
}

export function registerIpcHandlers(_settingsWindow: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: unknown) => {
    if (!isValidSettings(settings)) {
      throw new Error('Invalid settings format')
    }
    setSettings(settings)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_LIST, () => {
    return listMedia()
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_ADD, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: MEDIA_FILTERS
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return addMedia(result.filePaths[0])
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_REMOVE, (_event, id: string) => {
    if (typeof id !== 'string') {
      throw new Error('Invalid media id')
    }

    const settings = getSettings()
    if (settings.startMediaId === id) {
      setSettings({ ...settings, startMediaId: null })
    }
    if (settings.endMediaId === id) {
      const current = getSettings()
      setSettings({ ...current, endMediaId: null })
    }

    removeMedia(id)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_GET_PATH, (_event, id: string) => {
    if (typeof id !== 'string') {
      throw new Error('Invalid media id')
    }
    return getMediaStoredPath(id)
  })

  ipcMain.handle(IPC_CHANNELS.MEDIA_READ_FILE, (_event, source: string) => {
    if (typeof source !== 'string') {
      throw new Error('Invalid media source')
    }
    const mediaBaseDir = normalize(getMediaDir())
    if (!normalize(source).startsWith(mediaBaseDir)) {
      throw new Error('Unauthorized media path')
    }
    const data = readFileSync(source)
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  })
}
