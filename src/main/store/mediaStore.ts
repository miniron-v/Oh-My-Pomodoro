import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'
import type { MediaEntry } from '../../shared/types'

let mediaDir = ''
let registryPath = ''
let registry: MediaEntry[] | null = null

function ensurePaths(): void {
  if (mediaDir) return
  const userDataPath = app.getPath('userData')
  mediaDir = join(userDataPath, 'media')
  registryPath = join(userDataPath, 'media-registry.json')
  if (!existsSync(mediaDir)) {
    mkdirSync(mediaDir, { recursive: true })
  }
}

function loadRegistry(): MediaEntry[] {
  ensurePaths()
  if (registry) return registry

  if (!existsSync(registryPath)) {
    registry = []
    saveRegistry()
    return registry
  }

  try {
    const raw = readFileSync(registryPath, 'utf-8')
    registry = JSON.parse(raw) as MediaEntry[]
    return registry
  } catch {
    registry = []
    return registry
  }
}

function saveRegistry(): void {
  ensurePaths()
  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
}

export function listMedia(): MediaEntry[] {
  return loadRegistry()
}

export function addMedia(sourcePath: string): MediaEntry | null {
  ensurePaths()
  const entries = loadRegistry()

  const originalName = basename(sourcePath)
  const existing = entries.find((e) => e.originalName === originalName)
  if (existing) return existing

  const id = randomUUID()
  const ext = extname(sourcePath).toLowerCase()
  const storedFileName = `${id}${ext}`
  const destPath = join(mediaDir, storedFileName)

  copyFileSync(sourcePath, destPath)

  const entry: MediaEntry = {
    id,
    originalName,
    storedFileName,
    addedAt: new Date().toISOString()
  }

  entries.push(entry)
  saveRegistry()

  return entry
}

export function removeMedia(id: string): void {
  const entries = loadRegistry()
  const index = entries.findIndex((e) => e.id === id)
  if (index === -1) return

  const entry = entries[index]
  ensurePaths()
  const filePath = join(mediaDir, entry.storedFileName)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }

  entries.splice(index, 1)
  saveRegistry()
}

export function getMediaStoredPath(id: string): string | null {
  const entries = loadRegistry()
  const entry = entries.find((e) => e.id === id)
  if (!entry) return null

  ensurePaths()
  const filePath = join(mediaDir, entry.storedFileName)
  if (!existsSync(filePath)) return null

  return filePath
}

export function getMediaDir(): string {
  ensurePaths()
  return mediaDir
}
