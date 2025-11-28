// src/api/places.ts
import type { APIRoute } from 'astro'
import kaliningradPlaces from '../data/places/kaliningrad'

export const get: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const city = url.searchParams.get('city') || ''

  let places: any[] = []

  if (/калининград/i.test(city)) {
    places = kaliningradPlaces
  }

  return new Response(JSON.stringify({ city, places }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
