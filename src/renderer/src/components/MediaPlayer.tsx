import { useEffect, useRef } from 'react'

interface MediaPlayerProps {
  source: string
  soundMode: string
  onEnded: () => void
}

interface ImageDecoderInit {
  data: ReadableStream<Uint8Array>
  type: string
}

interface ImageDecodeResult {
  image: VideoFrame
  complete: boolean
}

interface ImageTrack {
  frameCount: number
}

interface ImageTrackList {
  selectedTrack: ImageTrack | null
}

interface ImageDecoderInstance {
  completed: Promise<void>
  tracks: ImageTrackList
  decode(options: { frameIndex: number }): Promise<ImageDecodeResult>
  close(): void
}

interface ImageDecoderConstructor {
  new (init: ImageDecoderInit): ImageDecoderInstance
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function GifPlayer({
  source,
  onEnded
}: {
  source: string
  onEnded: () => void
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false
    let decoder: ImageDecoderInstance | null = null

    async function loadGifBuffer(): Promise<ArrayBuffer> {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await fetch(source)
        return response.arrayBuffer()
      }
      return window.electronAPI.readMediaFile(source)
    }

    async function playGif(): Promise<void> {
      try {
        const buffer = await loadGifBuffer()
        if (cancelled) return

        const ImageDecoderClass = (window as unknown as Record<string, unknown>)
          .ImageDecoder as ImageDecoderConstructor | undefined
        if (!ImageDecoderClass) {
          console.error('[GifPlayer] ImageDecoder API not available')
          onEndedRef.current()
          return
        }

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(buffer))
            controller.close()
          }
        })

        decoder = new ImageDecoderClass({
          data: stream,
          type: 'image/gif'
        })

        await decoder.completed
        if (cancelled) return

        const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0
        if (frameCount === 0) {
          onEndedRef.current()
          return
        }

        for (let i = 0; i < frameCount; i++) {
          if (cancelled) return

          const frameStart = performance.now()

          const result = await decoder.decode({ frameIndex: i })
          if (cancelled) {
            result.image.close()
            return
          }

          const frame = result.image
          const rawDuration = frame.duration ?? 0
          const frameDurationMs = rawDuration / 1000
          const effectiveDelayMs = frameDurationMs > 0 ? frameDurationMs : 100

          const cw = canvas!.clientWidth
          const ch = canvas!.clientHeight
          if (canvas!.width !== cw || canvas!.height !== ch) {
            canvas!.width = cw
            canvas!.height = ch
          }

          const fw = frame.displayWidth
          const fh = frame.displayHeight
          const scale = Math.max(cw / fw, ch / fh)
          const dw = fw * scale
          const dh = fh * scale
          const dx = (cw - dw) / 2
          const dy = (ch - dh) / 2
          ctx!.drawImage(frame, dx, dy, dw, dh)

          frame.close()

          const elapsed = performance.now() - frameStart
          const remaining = effectiveDelayMs - elapsed
          if (!cancelled && remaining > 0) {
            await delay(remaining)
          }
        }

        if (!cancelled) {
          onEndedRef.current()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[GifPlayer] error:', err)
          onEndedRef.current()
        }
      }
    }

    playGif()

    return () => {
      cancelled = true
      if (decoder) {
        try {
          decoder.close()
        } catch {
          // decoder may already be closed
        }
        decoder = null
      }
    }
  }, [source])

  return <canvas ref={canvasRef} className="media-fullscreen" />
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
        const cw = canvas!.clientWidth
        const ch = canvas!.clientHeight
        if (canvas!.width !== cw || canvas!.height !== ch) {
          canvas!.width = cw
          canvas!.height = ch
        }

        const vw = video.videoWidth
        const vh = video.videoHeight
        const scale = Math.max(cw / vw, ch / vh)
        const dw = vw * scale
        const dh = vh * scale
        const dx = (cw - dw) / 2
        const dy = (ch - dh) / 2
        ctx!.drawImage(video, dx, dy, dw, dh)
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
  if (isGif(source)) {
    return <GifPlayer source={source} onEnded={onEnded} />
  }

  return <VideoPlayer source={source} soundMode={soundMode} onEnded={onEnded} />
}
