import { useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import SettingsForm from '../components/SettingsForm'
import '../styles/settings.css'

export default function SettingsPage(): React.ReactElement {
  const { settings, isLoading, loadSettings, saveSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function handleStart(): void {
    window.electronAPI.startTimer()
  }

  if (isLoading || !settings) {
    return <div className="settings-loading">로딩 중...</div>
  }

  return (
    <div className="settings-page">
      <SettingsForm
        initialSettings={settings}
        onSave={saveSettings}
        onStart={handleStart}
      />
    </div>
  )
}
