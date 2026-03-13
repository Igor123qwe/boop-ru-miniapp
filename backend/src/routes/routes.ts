import { Router } from 'express'
import { dbQuery } from '../db.js'

const router = Router()

router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params

    const routeResult = await dbQuery<{
      id: string
      city_id: string
      title: string
      short_description: string | null
      description: string | null
      difficulty: string | null
      distance_km: number | null
      days_count: number
      popularity: number
      cover_image: string | null
    }>(
      `
      SELECT id, city_id, title, short_description, description, difficulty, distance_km, days_count, popularity, cover_image
      FROM routes
      WHERE id = $1
      LIMIT 1
      `,
      [routeId]
    )

    if (routeResult.rows.length === 0) {
      res.status(404).json({ error: 'Route not found' })
      return
    }

    const route = routeResult.rows[0]

    const pointsResult = await dbQuery<{
      id: string
      route_id: string
      place_id: string
      day_index: number
      point_index: number
      visit_time: string | null
      description: string | null
      place_title: string
      place_description: string | null
      place_cover_image: string | null
    }>(
      `
      SELECT
        rp.id,
        rp.route_id,
        rp.place_id,
        rp.day_index,
        rp.point_index,
        rp.visit_time,
        rp.description,
        p.title AS place_title,
        p.description AS place_description,
        p.cover_image AS place_cover_image
      FROM route_points rp
      INNER JOIN places p ON p.id = rp.place_id
      WHERE rp.route_id = $1
      ORDER BY rp.day_index ASC, rp.point_index ASC
      `,
      [routeId]
    )

    const groupedDays = new Map<
      number,
      {
        dayIndex: number
        title: string
        points: Array<{
          id: string
          placeId: string
          title: string
          time: string | null
          description: string | null
          coverImage: string | null
        }>
      }
    >()

    for (const row of pointsResult.rows) {
      if (!groupedDays.has(row.day_index)) {
        groupedDays.set(row.day_index, {
          dayIndex: row.day_index,
          title: `День ${row.day_index + 1}`,
          points: [],
        })
      }

      groupedDays.get(row.day_index)!.points.push({
        id: row.id,
        placeId: row.place_id,
        title: row.place_title,
        time: row.visit_time,
        description: row.description ?? row.place_description,
        coverImage: row.place_cover_image,
      })
    }

    res.json({
      route: {
        id: route.id,
        cityId: route.city_id,
        title: route.title,
        shortDescription: route.short_description,
        description: route.description,
        difficulty: route.difficulty,
        distanceKm: route.distance_km,
        daysCount: route.days_count,
        popularity: route.popularity,
        coverImage: route.cover_image,
        days: Array.from(groupedDays.values()),
      },
    })
  } catch (error) {
    console.error('GET /api/routes/:routeId error', error)
    res.status(500).json({ error: 'Failed to load route' })
  }
})

export default router