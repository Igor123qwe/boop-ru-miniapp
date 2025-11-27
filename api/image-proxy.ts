// api/image-proxy.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const srcParam = Array.isArray(req.query.src) ? req.query.src[0] : req.query.src
  const src = typeof srcParam === 'string' ? srcParam : ''

  if (!src) {
    res.status(400).send('Parameter "src" is required')
    return
  }

  try {
    const upstream = await fetch(src)

    if (!upstream.ok || !upstream.body) {
      res.status(502).send('Upstream error')
      return
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')

    const arrayBuffer = await upstream.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    res.status(200).send(buffer)
  } catch (e) {
    console.error('image-proxy error', e)
    res.status(500).send('Proxy error')
  }
}
