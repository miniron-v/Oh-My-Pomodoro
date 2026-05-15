import { create } from 'zustand'
import type { TimerPhase } from '../types'

interface TimerStoreState {
  phase: TimerPhase
  remainingSeconds: number
  subscribe: () => void
}

export const useTimerStore = create<TimerStoreState>((set) => ({
  phase: 'idle',
  remainingSeconds: 0,

  subscribe: () => {
    window.electronAPI.onTick((remainingSeconds) => {
      set({ remainingSeconds })
    })
    window.electronAPI.onPhaseChange((phase) => {
      set({ phase: phase as TimerPhase })
    })
  }
}))
