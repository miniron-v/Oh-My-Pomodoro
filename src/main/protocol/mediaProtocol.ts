import { protocol } from 'electron'
import { getMediaDir } from '../store/mediaStore'
import { readFileSync, statSync } from 'fs'
import { extname, resolve, normalize } from 'path'

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.gif': 'image/gif',
  '.apng': 'image/apng'
}

export function registerMediaProtocol(): void {
  protocol.handle('media', (request) => {
    const url = new URL(request.url)
    const filePath = resolve(decodeURIComponent(url.pathname).replace(/^\/+/, ''))
    const mediaBase = normalize(getMediaDir())

    if (!normalize(filePath).startsWith(mediaBase)) {
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const stat = statSync(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1], 10)
          const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
          const chunk = readFileSync(filePath).subarray(start, end + 1)

          return new Response(chunk, {
            status: 206,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': String(chunk.byteLength),
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes'
            }
          })
        }
      }

      const data = readFileSync(filePath)
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(stat.size),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch (err) {
      console.error('[media-protocol] file read error:', err)
      return new Response('Not Found', { status: 404 })
    }
  })
}
