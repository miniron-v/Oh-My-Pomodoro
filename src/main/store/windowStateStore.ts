import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface TimerWindowState {
  x: number
  y: number
  width: number
  height: number
  hidden: boolean
}

const DEFAULT_STATE: TimerWindowState = {
  x: -1,
  y: -1,
  width: 280,
  height: 56,
  hidden: false
}

let statePath = ''
let cache: TimerWindowState | null = null
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function ensurePath(): void {
  if (statePath) return
  statePath = join(app.getPath('userData'), 'window-state.json')
}

export function getTimerWindowState(): TimerWindowState {
  ensurePath()
  if (cache) return cache

  if (!existsSync(statePath)) {
    cache = { ...DEFAULT_STATE }
    return cache
  }

  try {
    const raw = readFileSync(statePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<TimerWindowState>
    cache = { ...DEFAULT_STATE, ...parsed }
    return cache
  } catch {
    cache = { ...DEFAULT_STATE }
    return cache
  }
}

function writeToDisk(): void {
  ensurePath()
  writeFileSync(statePath, JSON.stringify(cache, null, 2), 'utf-8')
}

export function saveTimerWindowState(state: Partial<TimerWindowState>): void {
  const current = getTimerWindowState()
  cache = { ...current, ...state }

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(writeToDisk, 300)
}

export function flushTimerWindowState(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (cache) writeToDisk()
}
