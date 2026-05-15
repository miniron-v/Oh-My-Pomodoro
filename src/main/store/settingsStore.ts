import Store from 'electron-store'
import { type AppSettings, DEFAULT_SETTINGS } from '../../shared/types'

const store = new Store<AppSettings>({
  name: 'settings',
  defaults: DEFAULT_SETTINGS,
  schema: {
    workMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 120
    },
    shortBreakMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 60
    },
    longBreakMinutes: {
      type: 'number',
      minimum: 1,
      maximum: 60
    },
    longBreakInterval: {
      type: 'number',
      minimum: 1,
      maximum: 10
    },
    startVideoSource: {
      type: ['string', 'null']
    },
    endVideoSource: {
      type: ['string', 'null']
    },
    soundMode: {
      type: 'string',
      enum: ['video', 'alarm']
    }
  }
})

export function getSettings(): AppSettings {
  return {
    workMinutes: store.get('workMinutes'),
    shortBreakMinutes: store.get('shortBreakMinutes'),
    longBreakMinutes: store.get('longBreakMinutes'),
    longBreakInterval: store.get('longBreakInterval'),
    startVideoSource: store.get('startVideoSource'),
    endVideoSource: store.get('endVideoSource'),
    soundMode: store.get('soundMode')
  }
}

export function setSettings(settings: AppSettings): void {
  store.set(settings)
}
