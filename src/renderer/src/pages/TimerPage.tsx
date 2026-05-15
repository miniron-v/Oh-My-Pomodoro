import { useEffect } from 'react'
import { useTimerStore } from '../stores/timerStore'
import TimeDisplay from '../components/TimeDisplay'
import '../styles/timer.css'

const PHASE_LABELS: Record<string, string> = {
  work: '작업 중',
  'short-break': '휴식',
  'long-break': '긴 휴식',
  'video-playing': '전환 중',
  idle: '대기'
}

export default function TimerPage(): React.ReactElement {
  const { phase, remainingSeconds, paused, subscribe } = useTimerStore()

  useEffect(() => {
    subscribe()
  }, [subscribe])

  function handlePauseResume(): void {
    if (paused) {
      window.electronAPI.resumeTimer()
    } else {
      window.electronAPI.pauseTimer()
    }
  }

  function handleStop(): void {
    window.electronAPI.stopTimer()
  }

  function handleHide(): void {
    window.electronAPI.hideTimer()
  }

  return (
    <div className="timer-page">
      <button className="timer-hide-btn" onClick={handleHide} title="숨기기">
        <span className="icon-hide" />
      </button>
      <div className="timer-phase">{PHASE_LABELS[phase] ?? ''}</div>
      <TimeDisplay seconds={remainingSeconds} />
      <div className="timer-controls">
        <button className="timer-btn timer-pause-resume" onClick={handlePauseResume} title={paused ? '재개' : '일시정지'}>
          <span className={paused ? 'icon-play' : 'icon-pause'} />
        </button>
        <button className="timer-btn timer-stop" onClick={handleStop} title="정지">
          <span className="icon-stop" />
        </button>
      </div>
    </div>
  )
}
