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
  return 'media://host/' + encodeURIComponent(source)
}

const FRAME_ANIMATION_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.apng': 'image/apng'
}

function getFrameAnimationType(source: string): string | null {
  const ext = source.toLowerCase().slice(source.lastIndexOf('.'))
  return FRAME_ANIMATION_TYPES[ext] ?? null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function FrameAnimationPlayer({
  source,
  mimeType,
  onEnded
}: {
  source: string
  mimeType: string
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

    async function loadBuffer(): Promise<ArrayBuffer> {
      return window.electronAPI.readMediaFile(source)
    }

    async function playFrames(): Promise<void> {
      try {
        const buffer = await loadBuffer()
        if (cancelled) return

        const ImageDecoderClass = (window as unknown as Record<string, unknown>)
          .ImageDecoder as ImageDecoderConstructor | undefined
        if (!ImageDecoderClass) {
          console.error('[FrameAnimationPlayer] ImageDecoder API not available')
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
          type: mimeType
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

          ctx!.clearRect(0, 0, cw, ch)

          const fw = frame.displayWidth
          const fh = frame.displayHeight
          const scale = Math.min(cw / fw, ch / fh)
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
          console.error('[FrameAnimationPlayer] error:', err)
          onEndedRef.current()
        }
      }
    }

    playFrames()

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
  }, [source, mimeType])

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

        ctx!.clearRect(0, 0, cw, ch)

        const vw = video.videoWidth
        const vh = video.videoHeight
        const scale = Math.min(cw / vw, ch / vh)
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
  const frameType = getFrameAnimationType(source)
  if (frameType) {
    return <FrameAnimationPlayer source={source} mimeType={frameType} onEnded={onEnded} />
  }

  return <VideoPlayer source={source} soundMode={soundMode} onEnded={onEnded} />
}
