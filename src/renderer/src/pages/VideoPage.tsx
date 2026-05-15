import { useState, useEffect, useCallback } from 'react'
import MediaPlayer from '../components/MediaPlayer'
import '../styles/video.css'

interface PlayRequest {
  source: string
  soundMode: string
}

export default function VideoPage(): React.ReactElement {
  const [playRequest, setPlayRequest] = useState<PlayRequest | null>(null)

  const handleComplete = useCallback(() => {
    setPlayRequest(null)
    window.electronAPI.notifyVideoEnded()
  }, [])

  useEffect(() => {
    document.body.classList.add('video-page-body')
    return () => document.body.classList.remove('video-page-body')
  }, [])

  useEffect(() => {
    window.electronAPI.onPlayVideo((source, soundMode) => {
      setPlayRequest({ source, soundMode })
    })

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPlayRequest(null)
        window.electronAPI.notifyVideoSkip()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.electronAPI.removeAllListeners('video:play')
    }
  }, [])

  return (
    <div className="video-page">
      {playRequest && (
        <MediaPlayer
          source={playRequest.source}
          soundMode={playRequest.soundMode}
          onEnded={handleComplete}
        />
      )}
    </div>
  )
}
