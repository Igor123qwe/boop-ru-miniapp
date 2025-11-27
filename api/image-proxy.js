// api/image-proxy.js
const https = require('https')
const { URL } = require('url')

/**
 * Простой прокси для картинок:
 * /api/image-proxy?src=ENCODED_URL
 */
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

    https
      .get(urlObj, upstream => {
        const status = upstream.statusCode || 500

        if (status < 200 || status >= 300) {
          console.error('[image-proxy] upstream status:', status)
          res.statusCode = 502
          res.end('Upstream error: ' + status)
          upstream.resume()
          return
        }

        const contentType =
          (upstream.headers['content-type'] && String(upstream.headers['content-type'])) ||
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
      .on('error', err => {
        console.error('[image-proxy] request error:', err)
        if (!res.headersSent) res.statusCode = 500
        res.end('Proxy error')
      })
  } catch (e) {
    console.error('[image-proxy] outer error:', e)
    if (!res.headersSent) res.statusCode = 500
    res.end('Internal error')
  }
}
