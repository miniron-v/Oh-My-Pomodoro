import { useEffect } from 'react'
import { useTimerStore } from '../stores/timerStore'
import TimeDisplay from '../components/TimeDisplay'
import '../styles/timer.css'

const PHASE_LABELS: Record<string, string> = {
  work: '작업 중',
  'short-break': '짧은 휴식',
  'long-break': '긴 휴식',
  'video-playing': '전환 중',
  idle: '대기'
}

export default function TimerPage(): React.ReactElement {
  const { phase, remainingSeconds, subscribe } = useTimerStore()

  useEffect(() => {
    subscribe()
  }, [subscribe])

  function handleStop(): void {
    window.electronAPI.stopTimer()
  }

  return (
    <div className="timer-page">
      <div className="timer-phase">{PHASE_LABELS[phase] ?? ''}</div>
      <TimeDisplay seconds={remainingSeconds} />
      <button className="timer-stop" onClick={handleStop} title="정지">
        ■
      </button>
    </div>
  )
}
