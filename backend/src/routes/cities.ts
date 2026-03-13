import { Router } from 'express'
import { dbQuery } from '..db.js'

const router = Router()

router.get('', async (_req, res) = {
  try {
    const result = await dbQuery{
      id string
      title string
      slug string
      country string  null
      cover_image string  null
    }(
      `
      SELECT id, title, slug, country, cover_image
      FROM cities
      ORDER BY title ASC
      `
    )

    res.json({
      cities result.rows.map(row = ({
        id row.id,
        title row.title,
        slug row.slug,
        country row.country,
        coverImage row.cover_image,
      })),
    })
  } catch (error) {
    console.error('GET apicities error', error)
    res.status(500).json({ error 'Failed to load cities' })
  }
})

router.get('cityIdplaces', async (req, res) = {
  try {
    const { cityId } = req.params

    const result = await dbQuery{
      id string
      city_id string
      title string
      slug string
      description string  null
      cover_image string  null
      photos_count number
    }(
      `
      SELECT id, city_id, title, slug, description, cover_image, photos_count
      FROM places
      WHERE city_id = $1
      ORDER BY title ASC
      `,
      [cityId]
    )

    res.json({
      places result.rows.map(row = ({
        id row.id,
        cityId row.city_id,
        title row.title,
        slug row.slug,
        description row.description,
        coverImage row.cover_image,
        photosCount row.photos_count,
      })),
    })
  } catch (error) {
    console.error('GET apicitiescityIdplaces error', error)
    res.status(500).json({ error 'Failed to load places' })
  }
})

router.get('cityIdroutes', async (req, res) = {
  try {
    const { cityId } = req.params

    const result = await dbQuery{
      id string
      city_id string
      title string
      short_description string  null
      description string  null
      difficulty string  null
      distance_km number  null
      days_count number
      popularity number
      cover_image string  null
    }(
      `
      SELECT id, city_id, title, short_description, description, difficulty, distance_km, days_count, popularity, cover_image
      FROM routes
      WHERE city_id = $1
      ORDER BY popularity DESC, title ASC
      `,
      [cityId]
    )

    res.json({
      routes result.rows.map(row = ({
        id row.id,
        cityId row.city_id,
        title row.title,
        shortDescription row.short_description,
        description row.description,
        difficulty row.difficulty,
        distanceKm row.distance_km,
        daysCount row.days_count,
        popularity row.popularity,
        coverImage row.cover_image,
      })),
    })
  } catch (error) {
    console.error('GET apicitiescityIdroutes error', error)
    res.status(500).json({ error 'Failed to load routes' })
  }
})

export default router