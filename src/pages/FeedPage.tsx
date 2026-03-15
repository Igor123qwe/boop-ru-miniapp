import React, { useEffect, useMemo, useRef, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import {
  readSavedPostIds,
  readLikedPostIds,
  writeLikedPostIds,
  writeSavedPostIds,
} from '../utils/socialStorage'
import './FeedPage.css'

type Props = {
  onOpenRoutes: (city: string, routeId?: string) => void
  onCreateRoute?: () => void
  onCreatePlace?: () => void
  onCreateMoment?: () => void
}

type FeedPostType = 'route' | 'place' | 'moment'

type FeedPost = {
  id: string
  type: FeedPostType
  routeId: string
  city: string
  cityFolder: string
  title: string
  description: string
  image: string
  images: string[]
  likes: number
  daysCount?: number
  pointsCount?: number
  difficulty?: string
  distanceKm?: number
  previewPoints: string[]
  route: PopularRoute
  createdAt: string
  authorId?: string
  authorName?: string
  dayTitle?: string
  dayIndex?: number
  pointIndex?: number
}

type FeedPointRef = {
  title: string
  description?: string
  time?: string
  dayIndex: number
  pointIndex: number
}

type PlacePhotoDto = {
  id: string
  place_id: string
  url: string
  thumb_url?: string | null
  width?: number | null
  height?: number | null
  source?: string | null
  user_id?: string | null
  is_cover?: boolean
  sort_order?: number
  status?: string
  created_at?: string
}

type PlaceDto = {
  id: string
  city_id: string
  title: string
  slug?: string
  normalized_title?: string
  description?: string | null
  lat?: number | null
  lon?: number | null
  cover_image?: string | null
  photos_count?: number
  created_at?: string
  updated_at?: string
}

type ResolvePlaceReadyResponse = {
  status: 'ready'
  data: {
    place: PlaceDto
    photos: PlacePhotoDto[]
  }
}

type ResolvePlaceProcessingResponse = {
  status: 'processing'
  jobId?: number | string
  placeId?: string
  message?: string
}

type ResolvePlaceResponse =
  | ResolvePlaceReadyResponse
  | ResolvePlaceProcessingResponse

type ParseJobResponse = {
  id: number | string
  status: 'pending' | 'processing' | 'done' | 'error'
  payload?: Record<string, unknown> | null
}

const getWindowOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000'

const PUBLIC_APP_URL =
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  getWindowOrigin()

const MAX_ROUTE_FEED_IMAGES = 12
const MAX_ROUTE_POINTS_TO_TRY = 8
const MAX_CLOUD_POINT_IMAGES = 8
const CLOUD_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'webp', 'png']

const normalizeText = (value?: string): string => {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

const normalizeCityFolder = (city: string): string => {
  const c = city.toLowerCase().trim()

  if (c.includes('калининг')) return 'калининград'
  if (c.includes('моск')) return 'москва'
  if (
    c.includes('петербург') ||
    c.includes('санкт') ||
    c.includes('spb') ||
    c.includes('спб')
  ) {
    return 'санкт-петербург'
  }
  if (c.includes('сочи')) return 'сочи'
  if (c.includes('казан')) return 'казань'

  return c
}

const declension = (
  one: string,
  few: string,
  many: string,
  value: number
): string => {
  const v = Math.abs(value) % 100
  const v1 = v % 10
  if (v > 10 && v < 20) return many
  if (v1 > 1 && v1 < 5) return few
  if (v1 === 1) return one
  return many
}

const routeDifficultyLabel = (difficulty?: string): string => {
  if (difficulty === 'medium') return 'Средний'
  if (difficulty === 'hard') return 'Сложный'
  return 'Лёгкий'
}

const countRoutePoints = (route: PopularRoute): number => {
  return route.days.reduce((sum, day) => sum + day.points.length, 0)
}

const isUtilityPoint = (title?: string): boolean => {
  const t = normalizeText(title)
  if (!t) return true

  const utilityPatterns = [
    /^переезд/,
    /^завтрак/,
    /^обед/,
    /^ужин/,
    /^кофе/,
    /^ланч/,
    /^перекус/,
    /^возвращение/,
    /^заселение/,
    /^выезд/,
    /^дорога/,
    /^прогулка$/,
    /^свободное время$/,
    /^отдых$/,
    /^шопинг$/,
    /^магазин$/,
    /^рынок$/,
  ]

  return utilityPatterns.some(re => re.test(t))
}

const buildRoutePreview = (route: PopularRoute): string[] => {
  const points: string[] = []

  for (const day of route.days) {
    for (const point of day.points) {
      const title = point.title?.trim()
      if (!title || isUtilityPoint(title)) continue
      if (!points.includes(title)) points.push(title)
      if (points.length >= 3) return points
    }
  }

  return points
}

const resolveImageUrl = (url?: string): string => {
  const value = String(url || '').trim()
  if (!value) return ''

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image/') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  if (value.startsWith('//')) {
    return `https:${value}`
  }

  if (value.startsWith('/')) {
    return PUBLIC_APP_URL ? `${PUBLIC_APP_URL}${value}` : value
  }

  return PUBLIC_APP_URL
    ? `${PUBLIC_APP_URL}/${value.replace(/^\/+/, '')}`
    : `/${value.replace(/^\/+/, '')}`
}

const dedupeImages = (images: string[]): string[] => {
  return Array.from(
    new Set(
      images
        .map(img => resolveImageUrl(img))
        .filter(Boolean)
    )
  )
}

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

const createPlaceholderImage = (title: string, subtitle?: string): string => {
  const safeTitle = (title || 'Маршрут')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const safeSubtitle = (subtitle || 'ProGid')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <circle cx="980" cy="170" r="180" fill="rgba(255,255,255,0.08)"/>
      <circle cx="180" cy="640" r="220" fill="rgba(255,255,255,0.06)"/>
      <text x="80" y="620" font-size="62" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">
        ${safeTitle}
      </text>
      <text x="80" y="690" font-size="28" font-family="Arial, sans-serif" fill="rgba(255,255,255,0.78)">
        ${safeSubtitle}
      </text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const cleanupPlaceTitle = (title: string): string => {
  return title
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(Обед|Ужин|Завтрак)\s+в\s+районе\s+/i, '')
    .replace(/^(Обед|Ужин|Завтрак)\s+в\s+/i, '')
    .replace(/^(Обед|Ужин|Завтрак)\s+/i, '')
    .replace(/^Переезд\s+в\s+/i, '')
    .replace(/^Прогулка\s+по\s+/i, '')
    .replace(/^Посещение\s+/i, '')
    .replace(/^Осмотр\s+/i, '')
    .trim()
}

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/№/g, ' ')
    .replace(/["'«»]/g, '')
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

const buildPointSlug = (title?: string, fallback = 'point'): string => {
  const clean = cleanupPlaceTitle(title || '')
  const slug = slugify(clean)
  return slug || fallback
}

const buildExactCloudPrefix = (
  cityFolder: string,
  routeId: string,
  dayIndex: number,
  pointIndex: number,
  title?: string
): string => {
  const pointSlug = buildPointSlug(title, `point_${pointIndex}`)
  return `${CLOUD_BASE_URL}/${cityFolder}/${routeId}/day_${dayIndex}/point_${pointIndex}_${pointSlug}`
}

const buildLegacyCloudPrefix = (
  cityFolder: string,
  routeId: string,
  pointIndex: number
): string => {
  return `${CLOUD_BASE_URL}/${cityFolder}/${routeId}/point_${pointIndex}`
}

const buildPlacesCloudPrefix = (cityFolder: string, title?: string): string => {
  const pointSlug = buildPointSlug(title, 'place')
  return `${CLOUD_BASE_URL}/${cityFolder}/places/${pointSlug}`
}

const probeImageUrl = (url: string): Promise<boolean> => {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

const loadImagesByPrefix = async (prefix: string): Promise<string[]> => {
  const checks = Array.from({ length: MAX_CLOUD_POINT_IMAGES }, (_, index) => {
    const i = index + 1

    return Promise.all(
      CLOUD_IMAGE_EXTENSIONS.map(async ext => {
        const url = `${prefix}/image-${i}.${ext}`
        const ok = await probeImageUrl(url)
        return ok ? url : null
      })
    )
  })

  const results = await Promise.all(checks)

  return results
    .map(group => group.find(Boolean))
    .filter(Boolean) as string[]
}

const loadCloudPointImages = async (
  cityFolder: string,
  routeId: string,
  dayIndex: number,
  pointIndex: number,
  title?: string
): Promise<string[]> => {
  const exactPrefix = buildExactCloudPrefix(cityFolder, routeId, dayIndex, pointIndex, title)
  const legacyPrefix = buildLegacyCloudPrefix(cityFolder, routeId, pointIndex)
  const placesPrefix = buildPlacesCloudPrefix(cityFolder, title)

  const exactUrls = await loadImagesByPrefix(exactPrefix)
  if (exactUrls.length > 0) return exactUrls

  const legacyUrls = await loadImagesByPrefix(legacyPrefix)
  if (legacyUrls.length > 0) return legacyUrls

  const placesUrls = await loadImagesByPrefix(placesPrefix)
  if (placesUrls.length > 0) return placesUrls

  return []
}

const fetchPlaceFullByTitle = async (
  city: string,
  title: string
): Promise<ResolvePlaceResponse> => {
  const url = `${API_BASE_URL}/places/resolve/full?city=${encodeURIComponent(
    city
  )}&title=${encodeURIComponent(title)}`

  const res = await fetch(url)
  if (!res.ok) {
    let errorText = `HTTP ${res.status}`
    try {
      const data = await res.json()
      errorText = data?.details || data?.error || errorText
    } catch {
      //
    }
    throw new Error(errorText)
  }

  return (await res.json()) as ResolvePlaceResponse
}

const fetchParseJob = async (
  jobId: number | string
): Promise<ParseJobResponse | null> => {
  const res = await fetch(`${API_BASE_URL}/admin/parse-jobs/${jobId}`)
  if (!res.ok) return null
  return (await res.json()) as ParseJobResponse
}

const pollPlaceUntilReady = async (
  city: string,
  title: string,
  jobId?: number | string,
  maxAttempts = 12
): Promise<ResolvePlaceReadyResponse | null> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 2000)

    if (jobId) {
      const job = await fetchParseJob(jobId)
      if (job?.status === 'error') {
        return null
      }
    }

    const response = await fetchPlaceFullByTitle(city, title)
    if (response.status === 'ready') {
      return response
    }
  }

  return null
}

const getRouteOwnImages = (route: PopularRoute): string[] => {
  const imgs: string[] = []

  if ((route as any).coverImage) {
    imgs.push((route as any).coverImage as string)
  }

  if (Array.isArray((route as any).images)) {
    imgs.push(...((route as any).images as string[]))
  }

  return dedupeImages(imgs)
}

const getAllPointImagesFromRoute = (route: PopularRoute): string[] => {
  const imgs: string[] = []

  for (const day of route.days || []) {
    for (const point of day.points || []) {
      if (Array.isArray(point.images)) {
        imgs.push(...point.images)
      }
    }
  }

  return dedupeImages(imgs)
}

const getPointOwnImages = (
  route: PopularRoute,
  dayIndex?: number,
  pointIndex?: number
): string[] => {
  if (dayIndex === undefined || pointIndex === undefined) return []

  const point = route.days?.[dayIndex]?.points?.[pointIndex]
  if (!point || !Array.isArray(point.images)) return []

  return dedupeImages(point.images)
}

const buildRouteSemanticKey = (route: PopularRoute): string => {
  return [
    normalizeText(route.city),
    normalizeText(route.title),
    String(route.daysCount ?? ''),
    String(route.distanceKm ?? ''),
    normalizeText(route.shortDescription),
  ].join('::')
}

const uniqueRoutes = (routes: PopularRoute[]): PopularRoute[] => {
  const seen = new Set<string>()
  const result: PopularRoute[] = []

  for (const route of routes) {
    const key = buildRouteSemanticKey(route)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(route)
  }

  return result
}

const buildFeedPostSemanticKey = (post: FeedPost): string => {
  if (post.type === 'route') {
    return [
      'route',
      normalizeText(post.city),
      normalizeText(post.title),
      String(post.daysCount ?? ''),
      String(post.distanceKm ?? ''),
      normalizeText(post.description),
    ].join('::')
  }

  if (post.type === 'place') {
    return [
      'place',
      normalizeText(post.city),
      normalizeText(post.title),
      normalizeText(post.description),
      normalizeText(post.route?.title),
      normalizeText(post.dayTitle),
    ].join('::')
  }

  return [
    post.type,
    normalizeText(post.city),
    normalizeText(post.title),
    normalizeText(post.description),
  ].join('::')
}

const uniquePosts = (posts: FeedPost[]): FeedPost[] => {
  const seen = new Set<string>()
  const result: FeedPost[] = []

  for (const post of posts) {
    const key = buildFeedPostSemanticKey(post)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(post)
  }

  return result
}

const getAllRoutes = (): PopularRoute[] => {
  return Object.values(POPULAR_ROUTES).flat()
}

const getRouteMeaningfulPoints = (route: PopularRoute): FeedPointRef[] => {
  const items: FeedPointRef[] = []

  for (let dayIndex = 0; dayIndex < route.days.length; dayIndex += 1) {
    const day = route.days[dayIndex]

    for (let pointIndex = 0; pointIndex < day.points.length; pointIndex += 1) {
      const point = day.points[pointIndex]
      const title = point.title?.trim()
      if (!title || isUtilityPoint(title)) continue

      items.push({
        title,
        description: point.description,
        time: point.time,
        dayIndex,
        pointIndex,
      })

      if (items.length >= MAX_ROUTE_POINTS_TO_TRY) {
        return items
      }
    }
  }

  return items
}

const buildFeedPosts = (): FeedPost[] => {
  const routes = uniqueRoutes(getAllRoutes())
  const posts: FeedPost[] = []
  const seenPlaces = new Set<string>()

  for (const route of routes) {
    const previewPoints = buildRoutePreview(route)
    const pointsCount = countRoutePoints(route)
    const cityFolder = normalizeCityFolder(route.city || '')

    const routeOwnImages = getRouteOwnImages(route)
    const routePointImages = getAllPointImagesFromRoute(route)
    const routeImages = dedupeImages([
      ...routeOwnImages,
      ...routePointImages,
    ])

    posts.push({
      id: `route_${route.id}_${buildRouteSemanticKey(route)}`,
      type: 'route',
      routeId: route.id,
      city: route.city,
      cityFolder,
      title: route.title,
      description: route.shortDescription || 'Готовый маршрут по городу',
      image: routeImages[0] || '',
      images: routeImages,
      likes: route.popularity ?? 19,
      daysCount: route.daysCount,
      pointsCount,
      difficulty: route.difficulty,
      distanceKm: route.distanceKm,
      previewPoints,
      route,
      createdAt: new Date().toISOString(),
      authorId: 'system',
      authorName: 'ProGid',
    })

    route.days.forEach((day, dayIndex) => {
      day.points.forEach((point, pointIndex) => {
        if (!point.title?.trim()) return
        if (isUtilityPoint(point.title)) return

        const placeKey = [
          normalizeText(route.city),
          normalizeText(route.title),
          normalizeText(day.title),
          normalizeText(point.title),
          normalizeText(point.description),
        ].join('::')

        if (seenPlaces.has(placeKey)) return
        seenPlaces.add(placeKey)

        const pointImages = getPointOwnImages(route, dayIndex, pointIndex)

        posts.push({
          id: `place_${route.id}_${dayIndex}_${pointIndex}_${normalizeText(point.title)}`,
          type: 'place',
          routeId: route.id,
          city: route.city,
          cityFolder,
          title: point.title || 'Место',
          description: point.description || 'Интересное место маршрута',
          image: pointImages[0] || routeImages[0] || '',
          images: pointImages,
          likes: Math.max(8, (route.popularity ?? 20) - pointIndex),
          daysCount: route.daysCount,
          pointsCount,
          difficulty: route.difficulty,
          distanceKm: route.distanceKm,
          previewPoints,
          route,
          createdAt: new Date().toISOString(),
          authorId: `author_${route.id}_${dayIndex}_${pointIndex}`,
          authorName: 'Путешественник',
          dayTitle: day.title,
          dayIndex,
          pointIndex,
        })
      })
    })
  }

  return uniquePosts(posts)
}

const formatRelativeDate = (value?: string): string => {
  if (!value) return 'Недавно'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Недавно'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Только что'
  if (diffMin < 60) return `${diffMin} ${declension('минуту', 'минуты', 'минут', diffMin)} назад`
  if (diffHours < 24) return `${diffHours} ${declension('час', 'часа', 'часов', diffHours)} назад`
  if (diffDays < 7) return `${diffDays} ${declension('день', 'дня', 'дней', diffDays)} назад`

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  })
}

const getPostTypeLabel = (type: FeedPostType): string => {
  if (type === 'route') return 'Маршрут'
  if (type === 'moment') return 'Момент'
  return 'Место'
}

export const FeedPage: React.FC<Props> = ({
  onOpenRoutes,
  onCreateRoute,
  onCreatePlace,
  onCreateMoment,
}) => {
  const [likedPostIds, setLikedPostIds] = useState<string[]>([])
  const [savedPostIds, setSavedPostIds] = useState<string[]>([])
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({})
  const [openedPost, setOpenedPost] = useState<FeedPost | null>(null)
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  const placeImagesCacheRef = useRef<Map<string, string[]>>(new Map())
  const routeImagesCacheRef = useRef<Map<string, string[]>>(new Map())

  useEffect(() => {
    setLikedPostIds(readLikedPostIds())
    setSavedPostIds(readSavedPostIds())
  }, [])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    if (openedPost) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [openedPost])

  const initialFeedPosts = useMemo(() => buildFeedPosts(), [])

  useEffect(() => {
    setFeedPosts(initialFeedPosts)
  }, [initialFeedPosts])

  const getPlaceImagesCached = async (
    city: string,
    cityFolder: string,
    routeId: string,
    dayIndex: number,
    pointIndex: number,
    title: string,
    baseImages: string[]
  ): Promise<string[]> => {
    const key = `${normalizeText(city)}::${routeId}::${dayIndex}::${pointIndex}::${normalizeText(title)}`
    const cached = placeImagesCacheRef.current.get(key)
    if (cached) return cached

    let backendImages: string[] = []

    try {
      const response = await fetchPlaceFullByTitle(city, title)

      if (response.status === 'ready') {
        backendImages = dedupeImages(
          (response.data.photos || [])
            .map(photo => photo.url || photo.thumb_url || '')
            .filter(Boolean)
        )
      } else if (response.status === 'processing') {
        const readyResponse = await pollPlaceUntilReady(city, title, response.jobId)

        if (readyResponse?.status === 'ready') {
          backendImages = dedupeImages(
            (readyResponse.data.photos || [])
              .map(photo => photo.url || photo.thumb_url || '')
              .filter(Boolean)
          )
        }
      }
    } catch (error) {
      console.error('Feed place backend photos error:', city, title, error)
    }

    let cloudImages: string[] = []
    if (backendImages.length === 0) {
      try {
        cloudImages = await loadCloudPointImages(
          cityFolder,
          routeId,
          dayIndex,
          pointIndex,
          title
        )
      } catch (error) {
        console.error('Feed place cloud photos error:', city, title, error)
      }
    }

    const finalImages = dedupeImages([
      ...baseImages,
      ...backendImages,
      ...cloudImages,
    ])

    placeImagesCacheRef.current.set(key, finalImages)
    return finalImages
  }

  const getRouteImagesCached = async (
    route: PopularRoute,
    cityFolder: string
  ): Promise<string[]> => {
    const key = `${normalizeText(route.city)}::${route.id}`
    const cached = routeImagesCacheRef.current.get(key)
    if (cached) return cached

    const routeOwnImages = getRouteOwnImages(route)
    const routePointImages = getAllPointImagesFromRoute(route)

    if (routeOwnImages.length > 0 || routePointImages.length > 0) {
      const directImages = dedupeImages([
        ...routeOwnImages,
        ...routePointImages,
      ]).slice(0, MAX_ROUTE_FEED_IMAGES)

      routeImagesCacheRef.current.set(key, directImages)
      return directImages
    }

    const points = getRouteMeaningfulPoints(route)

    const perPointImages = await Promise.all(
      points.map(async point => {
        const pointOwnImages = getPointOwnImages(route, point.dayIndex, point.pointIndex)

        return await getPlaceImagesCached(
          route.city,
          cityFolder,
          route.id,
          point.dayIndex,
          point.pointIndex,
          point.title,
          pointOwnImages
        )
      })
    )

    const finalImages = dedupeImages(perPointImages.flat()).slice(0, MAX_ROUTE_FEED_IMAGES)

    routeImagesCacheRef.current.set(key, finalImages)
    return finalImages
  }

  useEffect(() => {
    let cancelled = false

    const enrichFeedPosts = async () => {
      setIsLoadingFeed(true)

      const enriched = await Promise.all(
        initialFeedPosts.map(async post => {
          if (post.type === 'place') {
            const pointOwnImages =
              post.dayIndex !== undefined && post.pointIndex !== undefined
                ? getPointOwnImages(post.route, post.dayIndex, post.pointIndex)
                : []

            const resolvedImages =
              post.dayIndex !== undefined && post.pointIndex !== undefined
                ? await getPlaceImagesCached(
                    post.city,
                    post.cityFolder,
                    post.routeId,
                    post.dayIndex,
                    post.pointIndex,
                    post.title,
                    pointOwnImages
                  )
                : pointOwnImages

            if (cancelled) return post

            const routeOwnImages = getRouteOwnImages(post.route)
            const routePointImages = getAllPointImagesFromRoute(post.route)

            const finalImages = dedupeImages([
              ...resolvedImages,
              ...post.images,
              ...routeOwnImages,
              ...routePointImages,
            ])

            return {
              ...post,
              image:
                finalImages[0] ||
                createPlaceholderImage(post.title, post.city),
              images: finalImages,
            }
          }

          if (post.type === 'route') {
            const routeOwnImages = getRouteOwnImages(post.route)
            const routePointImages = getAllPointImagesFromRoute(post.route)
            const resolvedRouteImages = await getRouteImagesCached(post.route, post.cityFolder)

            if (cancelled) return post

            const finalImages = dedupeImages([
              ...routeOwnImages,
              ...resolvedRouteImages,
              ...routePointImages,
              ...post.images,
            ]).slice(0, MAX_ROUTE_FEED_IMAGES)

            return {
              ...post,
              image:
                finalImages[0] ||
                createPlaceholderImage(post.title, `${post.city} · маршрут`),
              images: finalImages,
            }
          }

          return post
        })
      )

      if (!cancelled) {
        setFeedPosts(enriched)
        setIsLoadingFeed(false)
      }
    }

    enrichFeedPosts()

    return () => {
      cancelled = true
    }
  }, [initialFeedPosts])

  const toggleLike = (postId: string) => {
    setLikedPostIds(prev => {
      const next = prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]

      writeLikedPostIds(next)
      return next
    })
  }

  const toggleSave = (postId: string) => {
    setSavedPostIds(prev => {
      const next = prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]

      writeSavedPostIds(next)
      return next
    })
  }

  const getVisibleImages = (post: FeedPost): string[] => {
    const source = dedupeImages(
      post.images?.length ? post.images : post.image ? [post.image] : []
    )

    const visible = source.filter(img => !failedImages[`${post.id}_${img}`])
    if (visible.length > 0) return visible

    return [createPlaceholderImage(post.title, post.city)]
  }

  const getPostImageIndex = (postId: string, imagesLength: number) => {
    const current = imageIndexes[postId] ?? 0
    if (imagesLength <= 0) return 0
    return current >= imagesLength ? 0 : current
  }

  const showPrevPostImage = (postId: string, imagesLength: number) => {
    if (imagesLength <= 1) return

    setImageIndexes(prev => {
      const current = prev[postId] ?? 0
      return {
        ...prev,
        [postId]: (current - 1 + imagesLength) % imagesLength,
      }
    })
  }

  const showNextPostImage = (postId: string, imagesLength: number) => {
    if (imagesLength <= 1) return

    setImageIndexes(prev => {
      const current = prev[postId] ?? 0
      return {
        ...prev,
        [postId]: (current + 1) % imagesLength,
      }
    })
  }

  const setPostImageIndex = (postId: string, index: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [postId]: index,
    }))
  }

  const openRouteDirect = (post: FeedPost) => {
    onOpenRoutes(post.city, post.routeId)
    setOpenedPost(null)
  }

  const renderImageSlider = (post: FeedPost, variant: 'card' | 'modal' = 'card') => {
    const visibleImages = getVisibleImages(post)
    const currentImageIndex = getPostImageIndex(post.id, visibleImages.length)
    const currentImage = visibleImages[currentImageIndex] || ''
    const isModal = variant === 'modal'

    return (
      <div className={isModal ? 'feed-post-image-wrap' : 'feed-card-media'}>
        {visibleImages.length > 1 && (
          <button
            type="button"
            className="feed-carousel-btn left"
            onClick={e => {
              e.stopPropagation()
              showPrevPostImage(post.id, visibleImages.length)
            }}
          >
            ‹
          </button>
        )}

        <img
          src={currentImage}
          alt={post.title}
          className={isModal ? 'feed-post-image' : 'feed-card-image'}
          onError={() => {
            setFailedImages(prev => ({
              ...prev,
              [`${post.id}_${currentImage}`]: true,
            }))
          }}
        />

        <div className="feed-card-badges">
          <span className="feed-card-badge primary">{getPostTypeLabel(post.type)}</span>
          <span className="feed-card-badge">{post.city}</span>
        </div>

        {visibleImages.length > 1 && (
          <button
            type="button"
            className="feed-carousel-btn right"
            onClick={e => {
              e.stopPropagation()
              showNextPostImage(post.id, visibleImages.length)
            }}
          >
            ›
          </button>
        )}

        {visibleImages.length > 1 && (
          <div className="feed-card-dots">
            {visibleImages.map((img, idx) => (
              <button
                key={`${post.id}_${img}_${idx}`}
                type="button"
                className={`feed-card-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={e => {
                  e.stopPropagation()
                  setPostImageIndex(post.id, idx)
                }}
                aria-label={`Показать фото ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderStatsGrid = (post: FeedPost, isLiked: boolean) => {
    return (
      <div className="feed-post-stats">
        <div className="feed-post-stat">
          <div className="feed-post-stat-value">
            {post.likes + (isLiked ? 1 : 0)}
          </div>
          <div className="feed-post-stat-label">Лайков</div>
        </div>

        {typeof post.pointsCount !== 'undefined' && (
          <div className="feed-post-stat">
            <div className="feed-post-stat-value">{post.pointsCount}</div>
            <div className="feed-post-stat-label">Точек</div>
          </div>
        )}

        {typeof post.distanceKm !== 'undefined' && (
          <div className="feed-post-stat">
            <div className="feed-post-stat-value">~{post.distanceKm} км</div>
            <div className="feed-post-stat-label">Дистанция</div>
          </div>
        )}

        {post.difficulty && (
          <div className="feed-post-stat">
            <div className="feed-post-stat-value">
              {routeDifficultyLabel(post.difficulty)}
            </div>
            <div className="feed-post-stat-label">Сложность</div>
          </div>
        )}

        {typeof post.daysCount !== 'undefined' && (
          <div className="feed-post-stat">
            <div className="feed-post-stat-value">{post.daysCount}</div>
            <div className="feed-post-stat-label">
              {declension('день', 'дня', 'дней', post.daysCount)}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCard = (post: FeedPost) => {
    const isLiked = likedPostIds.includes(post.id)
    const isSaved = savedPostIds.includes(post.id)

    return (
      <article key={post.id} className="feed-card">
        <div className="feed-card-header">
          <div className="feed-card-author">
            <div className="feed-card-avatar">
              {(post.authorName || 'П').slice(0, 1).toUpperCase()}
            </div>
            <div className="feed-card-author-meta">
              <div className="feed-card-author-name">{post.authorName || 'Путешественник'}</div>
              <div className="feed-card-author-subtitle">
                {post.city} · {formatRelativeDate(post.createdAt)}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="feed-card-more"
            onClick={() => setOpenedPost(post)}
            aria-label="Открыть публикацию"
          >
            •••
          </button>
        </div>

        {renderImageSlider(post, 'card')}

        <div className="feed-card-actions-top">
          <div className="feed-card-actions-left">
            <button
              type="button"
              className={`feed-icon-btn ${isLiked ? 'active' : ''}`}
              onClick={() => toggleLike(post.id)}
            >
              ❤️
            </button>

            <button
              type="button"
              className="feed-icon-btn"
              onClick={() => setOpenedPost(post)}
            >
              💬
            </button>

            <button
              type="button"
              className="feed-icon-btn"
              onClick={() => openRouteDirect(post)}
              title="Открыть маршрут"
            >
              🧭
            </button>
          </div>

          <button
            type="button"
            className={`feed-icon-btn ${isSaved ? 'active' : ''}`}
            onClick={() => toggleSave(post.id)}
          >
            🔖
          </button>
        </div>

        <div className="feed-card-content">
          <div className="feed-card-stats-line">
            <strong>{post.likes + (isLiked ? 1 : 0)}</strong> нравится
          </div>

          <h3 className="feed-card-title">{post.title}</h3>

          {post.description && (
            <div className="feed-card-description">{post.description}</div>
          )}

          <div className="feed-card-meta-row">
            {post.type === 'place' && post.route?.title && (
              <span className="feed-meta-chip">Из маршрута: {post.route.title}</span>
            )}
            {post.dayTitle && <span className="feed-meta-chip">{post.dayTitle}</span>}
            {typeof post.distanceKm !== 'undefined' && (
              <span className="feed-meta-chip">~ {post.distanceKm} км</span>
            )}
            {post.difficulty && (
              <span className="feed-meta-chip">{routeDifficultyLabel(post.difficulty)}</span>
            )}
            {typeof post.pointsCount !== 'undefined' && (
              <span className="feed-meta-chip">{post.pointsCount} точек</span>
            )}
            {typeof post.daysCount !== 'undefined' && (
              <span className="feed-meta-chip">
                {post.daysCount} {declension('день', 'дня', 'дней', post.daysCount)}
              </span>
            )}
          </div>

          {post.previewPoints.length > 0 && (
            <div className="feed-preview-points">
              {post.previewPoints.map(point => (
                <span key={`${post.id}_${normalizeText(point)}`} className="feed-preview-point">
                  {point}
                </span>
              ))}
            </div>
          )}

          <div className="feed-card-bottom-row">
            <button
              type="button"
              className="feed-card-link-btn"
              onClick={() => setOpenedPost(post)}
            >
              Подробнее
            </button>

            <button
              type="button"
              className="feed-open-route-btn"
              onClick={() => openRouteDirect(post)}
            >
              Открыть маршрут
            </button>
          </div>
        </div>
      </article>
    )
  }

  const renderModal = () => {
    if (!openedPost) return null

    const isLiked = likedPostIds.includes(openedPost.id)
    const isSaved = savedPostIds.includes(openedPost.id)

    return (
      <div className="feed-post-backdrop" onClick={() => setOpenedPost(null)}>
        <div className="feed-post-modal" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="feed-post-close"
            onClick={() => setOpenedPost(null)}
          >
            ✕
          </button>

          {renderImageSlider(openedPost, 'modal')}

          <div className="feed-post-body">
            <div className="feed-post-author-row">
              <div className="feed-card-avatar">
                {(openedPost.authorName || 'П').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="feed-card-author-name">
                  {openedPost.authorName || 'Путешественник'}
                </div>
                <div className="feed-card-author-subtitle">
                  {openedPost.city} · {formatRelativeDate(openedPost.createdAt)}
                </div>
              </div>
            </div>

            <div className="feed-post-topline">
              <span className="feed-type">{getPostTypeLabel(openedPost.type)}</span>
              <span className="feed-city-tag">{openedPost.city}</span>
            </div>

            <div className="feed-post-title">{openedPost.title}</div>

            {openedPost.description && (
              <div className="feed-post-description">{openedPost.description}</div>
            )}

            {renderStatsGrid(openedPost, isLiked)}

            {openedPost.previewPoints.length > 0 && (
              <div className="feed-post-points">
                {openedPost.previewPoints.map(point => (
                  <span
                    key={`${openedPost.id}_${normalizeText(point)}`}
                    className="feed-post-point-chip"
                  >
                    {point}
                  </span>
                ))}
              </div>
            )}

            <div className="feed-post-actions">
              <button
                type="button"
                className={`feed-action-btn ${isLiked ? 'active' : ''}`}
                onClick={() => toggleLike(openedPost.id)}
              >
                ❤️ {openedPost.likes + (isLiked ? 1 : 0)}
              </button>

              <button
                type="button"
                className={`feed-action-btn ${isSaved ? 'active' : ''}`}
                onClick={() => toggleSave(openedPost.id)}
              >
                🔖 Сохранить
              </button>

              <button
                type="button"
                className="feed-open-route-btn"
                onClick={() => openRouteDirect(openedPost)}
              >
                Открыть маршрут
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-page">
      <div className="feed-shell">
        <div className="feed-topbar">
          <div>
            <h2 className="feed-page-title">Лента путешествий</h2>
            <div className="feed-subtitle">
              Маршруты, места и travel-публикации в единой ленте
            </div>
          </div>
        </div>

        <div className="feed-compose-card">
          <div className="feed-compose-left">
            <div className="feed-compose-avatar">🧭</div>
            <div className="feed-compose-texts">
              <div className="feed-compose-title">Поделись новым маршрутом</div>
              <div className="feed-compose-subtitle">
                Добавляй места, собирай маршрут и публикуй его в ленту
              </div>
            </div>
          </div>

          <div className="feed-compose-actions">
            {onCreateRoute && (
              <button type="button" className="feed-compose-main-btn" onClick={onCreateRoute}>
                Создать маршрут
              </button>
            )}
            {onCreatePlace && (
              <button type="button" className="feed-compose-icon-btn" onClick={onCreatePlace}>
                Место
              </button>
            )}
            {onCreateMoment && (
              <button type="button" className="feed-compose-icon-btn" onClick={onCreateMoment}>
                Момент
              </button>
            )}
          </div>
        </div>

        {isLoadingFeed && (
          <div className="feed-state-message">Загружаем фото маршрутов…</div>
        )}

        {!isLoadingFeed && feedPosts.length === 0 && (
          <div className="feed-state-message">В ленте пока нет публикаций</div>
        )}

        <div className="feed-list">
          {feedPosts.map(renderCard)}
        </div>
      </div>

      {renderModal()}
    </div>
  )
}

export default FeedPage