interface TimeDisplayProps {
  seconds: number
}

export default function TimeDisplay({ seconds }: TimeDisplayProps): React.ReactElement {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return <span className="time-display">{display}</span>
}
