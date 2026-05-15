import { create } from 'zustand'
import type { TimerPhase } from '../types'

interface TimerStoreState {
  phase: TimerPhase
  remainingSeconds: number
  paused: boolean
  subscribe: () => void
}

export const useTimerStore = create<TimerStoreState>((set) => ({
  phase: 'idle',
  remainingSeconds: 0,
  paused: false,

  subscribe: () => {
    window.electronAPI.onTick((remainingSeconds) => {
      set({ remainingSeconds })
    })
    window.electronAPI.onPhaseChange((phase) => {
      set({ phase: phase as TimerPhase })
    })
    window.electronAPI.onPaused((paused) => {
      set({ paused })
    })
  }
}))
