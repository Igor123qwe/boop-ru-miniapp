// api/image-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import https from 'https'
import { URL } from 'url'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const srcParam = Array.isArray(req.query.src) ? req.query.src[0] : req.query.src
  const src = typeof srcParam === 'string' ? srcParam : ''

  if (!src) {
    res.status(400).send('Parameter "src" is required')
    return
  }

  let urlObj: URL
  try {
    urlObj = new URL(src)
  } catch {
    res.status(400).send('Invalid "src" URL')
    return
  }

  console.log('[image-proxy] fetch:', urlObj.toString())

  https
    .get(urlObj, upstream => {
      const status = upstream.statusCode ?? 500

      if (status < 200 || status >= 300) {
        console.error('[image-proxy] upstream status:', status)
        res.status(502).send('Upstream error: ' + status)
        upstream.resume() // сбросить поток
        return
      }

      const contentType =
        (upstream.headers['content-type'] as string | undefined) || 'image/jpeg'

      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')

      // просто прокидываем байты дальше
      upstream.on('error', err => {
        console.error('[image-proxy] stream error:', err)
        if (!res.headersSent) res.status(500).end('Stream error')
        else res.end()
      })

      upstream.pipe(res)
    })
    .on('error', err => {
      console.error('[image-proxy] request error:', err)
      if (!res.headersSent) {
        res.status(500).send('Proxy error')
      } else {
        res.end()
      }
    })
}
