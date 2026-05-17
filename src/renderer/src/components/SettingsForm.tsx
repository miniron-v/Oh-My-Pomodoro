import { useState, useEffect } from 'react'
import type { AppSettings, MediaEntry, PomodoroMode } from '../types'
import MediaDropdown from './MediaDropdown'

interface SettingsFormProps {
  initialSettings: AppSettings
  onSave: (settings: AppSettings) => void
  onStart: () => void
}

function clampMinute(value: number): number {
  if (isNaN(value)) return 0
  const int = Math.floor(value)
  if (int < 0) return 0
  if (int > 59) return 59
  return int
}

export default function SettingsForm({
  initialSettings,
  onSave,
  onStart
}: SettingsFormProps): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [mediaList, setMediaList] = useState<MediaEntry[]>([])

  useEffect(() => {
    setSettings(initialSettings)
  }, [initialSettings])

  useEffect(() => {
    window.electronAPI.listMedia().then(setMediaList)
  }, [])

  function updateField<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    onSave(updated)
  }

  function updateAlarmMinute(field: 'alarmWorkMinute' | 'alarmBreakMinute', raw: number): void {
    const clamped = clampMinute(raw)
    const updated = { ...settings, [field]: clamped }
    setSettings(updated)
    onSave(updated)
  }

  function handleNumberBlur(e: React.FocusEvent<HTMLInputElement>): void {
    e.target.value = String(Number(e.target.value))
  }

  function handleAlarmBlur(e: React.FocusEvent<HTMLInputElement>, field: 'alarmWorkMinute' | 'alarmBreakMinute'): void {
    const clamped = clampMinute(Number(e.target.value))
    e.target.value = String(clamped)
    updateAlarmMinute(field, clamped)
  }

  async function handleAddMedia(field: 'startMediaId' | 'endMediaId'): Promise<void> {
    const entry = await window.electronAPI.addMedia()
    if (entry) {
      setMediaList((prev) =>
        prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]
      )
      updateField(field, entry.id)
    }
  }

  async function handleRemoveMedia(id: string): Promise<void> {
    await window.electronAPI.removeMedia(id)
    setMediaList((prev) => prev.filter((e) => e.id !== id))

    const updated = { ...settings }
    let changed = false
    if (updated.startMediaId === id) {
      updated.startMediaId = null
      changed = true
    }
    if (updated.endMediaId === id) {
      updated.endMediaId = null
      changed = true
    }
    if (changed) {
      setSettings(updated)
      onSave(updated)
    }
  }

  function renderMediaSelect(
    label: string,
    field: 'startMediaId' | 'endMediaId'
  ): React.ReactElement {
    return (
      <div className="media-group">
        <label>{label}</label>
        <MediaDropdown
          mediaList={mediaList}
          selectedId={settings[field]}
          onSelect={(id) => updateField(field, id)}
          onAdd={() => handleAddMedia(field)}
          onRemove={(id) => handleRemoveMedia(id)}
        />
      </div>
    )
  }

  return (
    <div className="settings-form">
      <h1 className="settings-title">Oh-My-Pomodoro</h1>

      <div className="settings-grid">
        <section className="settings-section">
          <div className="section-header">
            <h2>타이머 설정</h2>
            <div className="mode-toggle">
              <button
                className={`mode-btn${settings.mode === 'timer' ? ' active' : ''}`}
                onClick={() => updateField('mode', 'timer' as PomodoroMode)}
              >
                타이머
              </button>
              <button
                className={`mode-btn${settings.mode === 'alarm' ? ' active' : ''}`}
                onClick={() => updateField('mode', 'alarm' as PomodoroMode)}
              >
                알람
              </button>
            </div>
          </div>

          {settings.mode === 'timer' ? (
            <>
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
            </>
          ) : (
            <>
              <p className="settings-hint">매 시 0~59분 사이의 시각을 설정합니다.</p>
              <div className="setting-row">
                <label>작업 시작 시각 (분)</label>
                <input
                  className={`alarm-minute-input${settings.alarmWorkMinute === settings.alarmBreakMinute ? ' input-warning' : ''}`}
                  type="text"
                  inputMode="numeric"
                  value={settings.alarmWorkMinute}
                  onChange={(e) => updateAlarmMinute('alarmWorkMinute', Number(e.target.value))}
                  onBlur={(e) => handleAlarmBlur(e, 'alarmWorkMinute')}
                />
              </div>
              <div className="setting-row">
                <label>휴식 시작 시각 (분)</label>
                <input
                  className={`alarm-minute-input${settings.alarmWorkMinute === settings.alarmBreakMinute ? ' input-warning' : ''}`}
                  type="text"
                  inputMode="numeric"
                  value={settings.alarmBreakMinute}
                  onChange={(e) => updateAlarmMinute('alarmBreakMinute', Number(e.target.value))}
                  onBlur={(e) => handleAlarmBlur(e, 'alarmBreakMinute')}
                />
              </div>
              {settings.alarmWorkMinute === settings.alarmBreakMinute && (
                <p className="settings-warning">작업과 휴식 시각이 같으면 휴식 영상만 재생됩니다.</p>
              )}
            </>
          )}
        </section>

        <div>
          <section className="settings-section">
            <h2>미디어 설정</h2>
            <p className="settings-hint">미디어는 최대 5초간 재생됩니다. ESC로 스킵할 수 있습니다.</p>

            {renderMediaSelect('휴식 영상 (작업 → 휴식)', 'endMediaId')}
            {renderMediaSelect('작업 영상 (휴식 → 작업)', 'startMediaId')}
            <p className="settings-hint">투명 배경을 사용하려면 APNG 또는 WebM을 권장합니다. GIF는 경계가 거칠 수 있으며, 나머지 형식은 투명을 지원하지 않습니다.</p>
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
        </div>
      </div>

      <button className="start-button" onClick={onStart}>
        시작
      </button>
    </div>
  )
}
