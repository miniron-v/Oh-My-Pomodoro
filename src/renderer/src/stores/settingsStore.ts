import { create } from 'zustand'
import type { AppSettings } from '../types'

interface SettingsStoreState {
  settings: AppSettings | null
  isLoading: boolean
  loadSettings: () => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  settings: null,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true })
    const settings = await window.electronAPI.getSettings()
    set({ settings, isLoading: false })
  },

  saveSettings: async (settings: AppSettings) => {
    await window.electronAPI.setSettings(settings)
    set({ settings })
  }
}))
