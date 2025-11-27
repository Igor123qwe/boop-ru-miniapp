// api/image-proxy.js
const http = require('http')
const https = require('https')
const { URL } = require('url')

module.exports = (req, res) => {
  try {
    const query = req.query || {}
    const srcParam = Array.isArray(query.src) ? query.src[0] : query.src
    const src = typeof srcParam === 'string' ? srcParam : ''

    if (!src) {
      res.statusCode = 400
      res.end('Parameter "src" is required')
      return
    }

    let urlObj
    try {
      urlObj = new URL(src)
    } catch (e) {
      console.error('[image-proxy] invalid URL:', src, e)
      res.statusCode = 400
      res.end('Invalid "src" URL')
      return
    }

    console.log('[image-proxy] fetching:', urlObj.toString())

    const client = urlObj.protocol === 'http:' ? http : https

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        // ❗ Притворяемся обычным браузером
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://pixabay.com/',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    }

    const upstreamReq = client.request(options, upstream => {
      const status = upstream.statusCode || 500

      if (status < 200 || status >= 300) {
        console.error('[image-proxy] upstream status:', status)
        res.statusCode = 502
        res.end('Upstream error: ' + status)
        upstream.resume()
        return
      }

      const contentType =
        (upstream.headers['content-type'] &&
          String(upstream.headers['content-type'])) ||
        'image/jpeg'

      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')

      upstream.on('error', err => {
        console.error('[image-proxy] stream error:', err)
        if (!res.headersSent) res.statusCode = 500
        res.end('Stream error')
      })

      upstream.pipe(res)
    })

    upstreamReq.on('error', err => {
      console.error('[image-proxy] request error:', err)
      if (!res.headersSent) res.statusCode = 500
      res.end('Proxy error')
    })

    upstreamReq.end()
  } catch (e) {
    console.error('[image-proxy] outer error:', e)
    if (!res.headersSent) res.statusCode = 500
    res.end('Internal error')
  }
}
