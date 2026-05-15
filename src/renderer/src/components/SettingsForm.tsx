import { useState, useEffect } from 'react'
import type { AppSettings } from '../types'

const MEDIA_FILTERS = [
  { name: 'Media', extensions: ['mp4', 'webm', 'gif', 'mov', 'avi'] }
]

interface SettingsFormProps {
  initialSettings: AppSettings
  onSave: (settings: AppSettings) => void
  onStart: () => void
}

export default function SettingsForm({
  initialSettings,
  onSave,
  onStart
}: SettingsFormProps): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>(initialSettings)

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  function updateField<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    onSave(updated)
  }

  function handleNumberBlur(e: React.FocusEvent<HTMLInputElement>): void {
    e.target.value = String(Number(e.target.value))
  }

  async function handleSelectFile(field: 'startVideoSource' | 'endVideoSource'): Promise<void> {
    const path = await window.electronAPI.selectFile(MEDIA_FILTERS)
    if (path) {
      updateField(field, path)
    }
  }

  function handleUrlInput(field: 'startVideoSource' | 'endVideoSource', value: string): void {
    updateField(field, value || null)
  }

  function handleClearMedia(field: 'startVideoSource' | 'endVideoSource'): void {
    updateField(field, null)
  }

  function getDisplayName(source: string | null): string {
    if (!source) return ''
    if (source.startsWith('http://') || source.startsWith('https://')) return source
    const parts = source.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1]
  }

  return (
    <div className="settings-form">
      <h1 className="settings-title">Oh-My-Pomodoro</h1>

      <section className="settings-section">
        <h2>타이머 설정</h2>
        <div className="setting-row">
          <label>작업 시간 (분)</label>
          <input
            type="number"
            min={1}
            max={120}
            value={settings.workMinutes}
            onChange={(e) => updateField('workMinutes', Number(e.target.value))}
            onBlur={handleNumberBlur}
          />
        </div>
        <div className="setting-row">
          <label>짧은 휴식 (분)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={settings.shortBreakMinutes}
            onChange={(e) => updateField('shortBreakMinutes', Number(e.target.value))}
            onBlur={handleNumberBlur}
          />
        </div>
        <div className="setting-row">
          <label>긴 휴식 (분)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={settings.longBreakMinutes}
            onChange={(e) => updateField('longBreakMinutes', Number(e.target.value))}
            onBlur={handleNumberBlur}
          />
        </div>
        <div className="setting-row">
          <label>긴 휴식 인터벌 (회)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.longBreakInterval}
            onChange={(e) => updateField('longBreakInterval', Number(e.target.value))}
            onBlur={handleNumberBlur}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>미디어 설정</h2>
        <p className="settings-hint">미디어는 최대 5초간 재생됩니다. ESC로 스킵할 수 있습니다.</p>

        <div className="media-group">
          <label>시작 영상 (휴식 → 작업)</label>
          <div className="media-controls">
            <span className="media-display">{getDisplayName(settings.startVideoSource) || '없음'}</span>
            <button type="button" onClick={() => handleSelectFile('startVideoSource')}>파일 선택</button>
            {settings.startVideoSource && (
              <button type="button" onClick={() => handleClearMedia('startVideoSource')}>제거</button>
            )}
          </div>
          <input
            type="text"
            placeholder="또는 URL 입력 (https://...)"
            value={
              settings.startVideoSource?.startsWith('http') ? settings.startVideoSource : ''
            }
            onChange={(e) => handleUrlInput('startVideoSource', e.target.value)}
          />
        </div>

        <div className="media-group">
          <label>종료 영상 (작업 → 휴식)</label>
          <div className="media-controls">
            <span className="media-display">{getDisplayName(settings.endVideoSource) || '없음'}</span>
            <button type="button" onClick={() => handleSelectFile('endVideoSource')}>파일 선택</button>
            {settings.endVideoSource && (
              <button type="button" onClick={() => handleClearMedia('endVideoSource')}>제거</button>
            )}
          </div>
          <input
            type="text"
            placeholder="또는 URL 입력 (https://...)"
            value={
              settings.endVideoSource?.startsWith('http') ? settings.endVideoSource : ''
            }
            onChange={(e) => handleUrlInput('endVideoSource', e.target.value)}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>알림음</h2>
        <div className="setting-row">
          <label>모드</label>
          <select
            value={settings.soundMode}
            onChange={(e) => updateField('soundMode', e.target.value as 'video' | 'alarm')}
          >
            <option value="video">영상 소리 사용</option>
            <option value="alarm">내장 알림음 사용</option>
          </select>
        </div>
      </section>

      <button className="start-button" onClick={onStart}>
        시작
      </button>
    </div>
  )
}
