import { useEffect, useRef } from 'react'

interface MediaPlayerProps {
  source: string
  soundMode: string
  onEnded: () => void
}

function toPlayableUrl(source: string): string {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source
  }
  return 'media://host/' + encodeURIComponent(source)
}

function isGif(source: string): boolean {
  const lower = source.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const pathname = new URL(lower).pathname
      return pathname.endsWith('.gif')
    } catch {
      return lower.endsWith('.gif')
    }
  }
  return lower.endsWith('.gif')
}

function VideoPlayer({
  source,
  soundMode,
  onEnded
}: MediaPlayerProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const url = toPlayableUrl(source)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const video = document.createElement('video')
    video.muted = soundMode !== 'video'
    video.playsInline = true
    video.preload = 'auto'

    let animFrame = 0
    let cancelled = false

    function drawFrame(): void {
      if (cancelled) return
      if (video.videoWidth && video.videoHeight) {
        if (canvas!.width !== video.videoWidth || canvas!.height !== video.videoHeight) {
          canvas!.width = video.videoWidth
          canvas!.height = video.videoHeight
        }
        ctx!.drawImage(video, 0, 0)
      }
      animFrame = requestAnimationFrame(drawFrame)
    }

    function handleCanPlay(): void {
      if (cancelled) return
      video.play().catch((err) => {
        if (!cancelled) console.error('[MediaPlayer] play() failed:', err)
      })
      drawFrame()
    }

    function handleEnded(): void {
      if (cancelled) return
      cancelAnimationFrame(animFrame)
      onEndedRef.current()
    }

    function handleError(): void {
      if (cancelled) return
      console.error('[MediaPlayer] video error:', video.error?.code, video.error?.message)
    }

    video.addEventListener('canplay', handleCanPlay, { once: true })
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    video.src = url
    video.load()

    return () => {
      cancelled = true
      cancelAnimationFrame(animFrame)
      video.pause()
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
      video.removeAttribute('src')
      video.load()
    }
  }, [source, soundMode, url])

  return <canvas ref={canvasRef} className="media-fullscreen" />
}

export default function MediaPlayer({
  source,
  soundMode,
  onEnded
}: MediaPlayerProps): React.ReactElement {
  const url = toPlayableUrl(source)

  if (isGif(source)) {
    return <img className="media-fullscreen" src={url} alt="" />
  }

  return <VideoPlayer source={source} soundMode={soundMode} onEnded={onEnded} />
}
