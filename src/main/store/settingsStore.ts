import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { type AppSettings, DEFAULT_SETTINGS } from '../../shared/types'

let settingsPath = ''
let cache: AppSettings | null = null

function ensurePath(): void {
  if (settingsPath) return
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }
  settingsPath = join(userDataPath, 'settings.json')
}

function load(): AppSettings {
  ensurePath()
  if (cache) return cache

  if (!existsSync(settingsPath)) {
    cache = { ...DEFAULT_SETTINGS }
    save(cache)
    return cache
  }

  try {
    const raw = readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    cache = { ...DEFAULT_SETTINGS, ...parsed }
    return cache
  } catch {
    cache = { ...DEFAULT_SETTINGS }
    return cache
  }
}

function save(settings: AppSettings): void {
  ensurePath()
  cache = settings
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSettings(): AppSettings {
  return load()
}

export function setSettings(settings: AppSettings): void {
  save(settings)
}
