import { Router } from 'express'
import { dbQuery } from '../db.js'

const router = Router()

router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params

    const result = await dbQuery<{
      id: string
      city_id: string
      title: string
      slug: string
      normalized_title: string
      description: string | null
      lat: number | null
      lon: number | null
      cover_image: string | null
      photos_count: number
    }>(
      `
      SELECT id, city_id, title, slug, normalized_title, description, lat, lon, cover_image, photos_count
      FROM places
      WHERE id = $1
      LIMIT 1
      `,
      [placeId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Place not found' })
      return
    }

    const row = result.rows[0]

    res.json({
      place: {
        id: row.id,
        cityId: row.city_id,
        title: row.title,
        slug: row.slug,
        normalizedTitle: row.normalized_title,
        description: row.description,
        lat: row.lat,
        lon: row.lon,
        coverImage: row.cover_image,
        photosCount: row.photos_count,
      },
    })
  } catch (error) {
    console.error('GET /api/places/:placeId error', error)
    res.status(500).json({ error: 'Failed to load place' })
  }
})

router.get('/:placeId/photos', async (req, res) => {
  try {
    const { placeId } = req.params

    const result = await dbQuery<{
      id: string
      place_id: string
      url: string
      thumb_url: string | null
      width: number | null
      height: number | null
      source: string
      user_id: string | null
      is_cover: boolean
      sort_order: number
      status: string
      created_at: string
    }>(
      `
      SELECT id, place_id, url, thumb_url, width, height, source, user_id, is_cover, sort_order, status, created_at
      FROM place_photos
      WHERE place_id = $1
        AND status = 'active'
      ORDER BY is_cover DESC, sort_order ASC, created_at ASC
      `,
      [placeId]
    )

    res.json({
      photos: result.rows.map(row => ({
        id: row.id,
        placeId: row.place_id,
        url: row.url,
        thumbUrl: row.thumb_url,
        width: row.width,
        height: row.height,
        source: row.source,
        userId: row.user_id,
        isCover: row.is_cover,
        sortOrder: row.sort_order,
        status: row.status,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('GET /api/places/:placeId/photos error', error)
    res.status(500).json({ error: 'Failed to load place photos' })
  }
})

export default router