import React, { useEffect, useMemo, useState } from 'react'
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

type PlacePhotoDto = {
  id: string
  place_id: string
  url: string
  thumb_url?: string | null
}

type ResolvePlaceReadyResponse = {
  status: 'ready'
  data: {
    place: {
      id: string
      city_id: string
      title: string
    }
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

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000'

const LOCAL_TRIPS_KEY = 'progid_my_trips'
const MAX_ROUTE_FEED_IMAGES = 10
const MAX_ROUTE_BACKEND_POINTS_TO_TRY = 4

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

const dedupeImages = (images: string[]): string[] => {
  return Array.from(
    new Set(
      images
        .map(img => String(img || '').trim())
        .filter(Boolean)
        .filter(img => !img.includes('example.com'))
    )
  )
}

const getCityCoverImage = (city: string): string => {
  const cityFolder = normalizeCityFolder(city || '')
  return `${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`
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

const getAllPointImagesFromRoute = (route: PopularRoute): string[] => {
  const imgs: string[] = []

  for (const day of route.days) {
    for (const point of day.points) {
      if (Array.isArray(point.images) && point.images.length > 0) {
        imgs.push(...point.images.filter(Boolean))
      }
    }
  }

  return dedupeImages(imgs)
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

const buildFeedPosts = (): FeedPost[] => {
  const routes = uniqueRoutes(getAllRoutes())
  const posts: FeedPost[] = []
  const seenPlaces = new Set<string>()

  for (const route of routes) {
    const previewPoints = buildRoutePreview(route)
    const pointsCount = countRoutePoints(route)
    const cityFolder = normalizeCityFolder(route.city || '')

    const routeImages = dedupeImages([
      ...getRouteOwnImages(route),
      ...getAllPointImagesFromRoute(route),
    ])

    posts.push({
      id: `route_${route.id}_${buildRouteSemanticKey(route)}`,
      type: 'route',
      routeId: route.id,
      city: route.city,
      cityFolder,
      title: route.title,
      description: route.shortDescription || 'Готовый маршрут по городу',
      image: routeImages[0] || getCityCoverImage(route.city || ''),
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
          image:
            pointImages[0] ||
            routeImages[0] ||
            getCityCoverImage(route.city || ''),
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

const wait = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

const fetchPlaceFullByTitle = async (
  city: string,
  title: string
): Promise<ResolvePlaceResponse> => {
  const url = `${API_BASE_URL}/places/resolve/full?city=${encodeURIComponent(
    city
  )}&title=${encodeURIComponent(title)}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
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
  maxAttempts = 10
): Promise<ResolvePlaceReadyResponse | null> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await wait(attempt === 0 ? 1200 : 1800)

    if (jobId) {
      const job = await fetchParseJob(jobId)
      if (job?.status === 'error') return null
    }

    const response = await fetchPlaceFullByTitle(city, title)
    if (response.status === 'ready') {
      return response
    }
  }

  return null
}

const fetchBackendPlaceImages = async (
  city: string,
  title: string
): Promise<string[]> => {
  try {
    const response = await fetchPlaceFullByTitle(city, title)

    if (response.status === 'ready') {
      return dedupeImages(
        (response.data.photos || []).map(photo => photo.thumb_url || photo.url || '')
      )
    }

    if (response.status === 'processing') {
      const readyResponse = await pollPlaceUntilReady(city, title, response.jobId)
      if (readyResponse?.status === 'ready') {
        return dedupeImages(
          (readyResponse.data.photos || []).map(photo => photo.thumb_url || photo.url || '')
        )
      }
    }

    return []
  } catch {
    return []
  }
}

const getRouteMeaningfulPoints = (route: PopularRoute): string[] => {
  const titles: string[] = []

  for (const day of route.days) {
    for (const point of day.points) {
      const title = point.title?.trim()
      if (!title || isUtilityPoint(title)) continue
      titles.push(title)
      if (titles.length >= MAX_ROUTE_BACKEND_POINTS_TO_TRY) return titles
    }
  }

  return titles
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
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [openedPost, setOpenedPost] = useState<FeedPost | null>(null)
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])

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

  useEffect(() => {
    let cancelled = false

    const enrichFeedPosts = async () => {
      const enriched = await Promise.all(
        initialFeedPosts.map(async post => {
          if (post.type === 'place') {
            const backendImages = await fetchBackendPlaceImages(post.city, post.title)
            if (cancelled || backendImages.length === 0) return post

            return {
              ...post,
              image: backendImages[0] || post.image,
              images: backendImages,
            }
          }

          if (post.type === 'route') {
            const ownImages = dedupeImages(post.images || [])
            if (ownImages.length > 0) {
              return {
                ...post,
                image: ownImages[0] || post.image,
                images: ownImages,
              }
            }

            const pointTitles = getRouteMeaningfulPoints(post.route)
            const collected: string[] = []

            for (const title of pointTitles) {
              const images = await fetchBackendPlaceImages(post.city, title)
              collected.push(...images)
              if (dedupeImages(collected).length >= MAX_ROUTE_FEED_IMAGES) break
            }

            if (cancelled) return post

            const routeImages = dedupeImages(collected).slice(0, MAX_ROUTE_FEED_IMAGES)
            if (routeImages.length === 0) return post

            return {
              ...post,
              image: routeImages[0] || post.image,
              images: routeImages,
            }
          }

          return post
        })
      )

      if (!cancelled) {
        setFeedPosts(enriched)
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
    const source = post.images?.length ? post.images : post.image ? [post.image] : []
    const visible = source.filter(img => img && !failedImages[`${post.id}_${img}`])

    if (visible.length > 0) return visible

    return post.image ? [post.image].filter(Boolean) : []
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

  const renderCard = (post: FeedPost) => {
    const visibleImages = getVisibleImages(post)
    const currentImageIndex = getPostImageIndex(post.id, visibleImages.length)
    const currentImage = visibleImages[currentImageIndex] || ''

    const isLiked = likedPostIds.includes(post.id)
    const isSaved = savedPostIds.includes(post.id)

    return (
      <article key={post.id} className="feed-card" onClick={() => setOpenedPost(post)}>
        <div className="feed-image-wrap">
          <div className="feed-image-overlay">
            <div className="feed-image-chip">
              {post.type === 'route'
                ? 'Маршрут'
                : post.type === 'moment'
                  ? 'Момент'
                  : 'Место'}
            </div>
            <div className="feed-image-chip">{post.city}</div>
          </div>

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

          {currentImage ? (
            <img
              src={currentImage}
              alt={post.title}
              className="feed-image"
              onError={() => {
                setFailedImages(prev => ({
                  ...prev,
                  [`${post.id}_${currentImage}`]: true,
                }))
              }}
            />
          ) : (
            <div className="feed-image" style={{ display: 'grid', placeItems: 'center' }}>
              Нет фото
            </div>
          )}

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
            <div className="feed-carousel-counter">
              {currentImageIndex + 1} / {visibleImages.length}
            </div>
          )}
        </div>

        <div className="feed-content">
          <div className="feed-title">{post.title}</div>
          <div className="feed-description">{post.description}</div>

          <div className="feed-meta-line">
            {post.type === 'place' && post.route?.title && (
              <span>Из маршрута: {post.route.title}</span>
            )}
            {post.dayTitle && <span>{post.dayTitle}</span>}
            {typeof post.distanceKm !== 'undefined' && <span>~ {post.distanceKm} км</span>}
            {post.difficulty && <span>{routeDifficultyLabel(post.difficulty)}</span>}
          </div>

          {post.previewPoints.length > 0 && post.type === 'route' && (
            <div className="feed-preview-points">
              {post.previewPoints.map(point => (
                <span key={point} className="feed-preview-point">
                  {point}
                </span>
              ))}
            </div>
          )}

          <div className="feed-actions">
            <button
              type="button"
              className={`feed-action-btn ${isLiked ? 'active' : ''}`}
              onClick={e => {
                e.stopPropagation()
                toggleLike(post.id)
              }}
            >
              ❤️ {post.likes + (isLiked ? 1 : 0)}
            </button>

            <button
              type="button"
              className={`feed-action-btn ${isSaved ? 'active' : ''}`}
              onClick={e => {
                e.stopPropagation()
                toggleSave(post.id)
              }}
            >
              🔖 Сохранить
            </button>

            <button
              type="button"
              className="feed-open-route-btn"
              onClick={e => {
                e.stopPropagation()
                onOpenRoutes(post.city, post.routeId)
              }}
            >
              Открыть
            </button>
          </div>

          {visibleImages.length > 1 && (
            <div className="feed-actions" style={{ marginTop: 10 }}>
              {visibleImages.map((img, idx) => (
                <button
                  key={`${post.id}_${img}_${idx}`}
                  type="button"
                  className={idx === currentImageIndex ? 'feed-action-btn active' : 'feed-action-btn'}
                  onClick={e => {
                    e.stopPropagation()
                    setPostImageIndex(post.id, idx)
                  }}
                  style={{ padding: '8px 10px', minWidth: 40 }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </article>
    )
  }

  const renderModal = () => {
    if (!openedPost) return null

    const visibleImages = getVisibleImages(openedPost)
    const currentImageIndex = getPostImageIndex(openedPost.id, visibleImages.length)
    const currentImage = visibleImages[currentImageIndex] || ''
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

          <div className="feed-post-image-wrap">
            {visibleImages.length > 1 && (
              <button
                type="button"
                className="feed-carousel-btn left"
                onClick={() => showPrevPostImage(openedPost.id, visibleImages.length)}
              >
                ‹
              </button>
            )}

            {currentImage ? (
              <img
                src={currentImage}
                alt={openedPost.title}
                className="feed-post-image"
                onError={() => {
                  setFailedImages(prev => ({
                    ...prev,
                    [`${openedPost.id}_${currentImage}`]: true,
                  }))
                }}
              />
            ) : (
              <div
                className="feed-post-image"
                style={{ display: 'grid', placeItems: 'center' }}
              >
                Нет фото
              </div>
            )}

            {visibleImages.length > 1 && (
              <button
                type="button"
                className="feed-carousel-btn right"
                onClick={() => showNextPostImage(openedPost.id, visibleImages.length)}
              >
                ›
              </button>
            )}

            {visibleImages.length > 1 && (
              <div className="feed-carousel-counter">
                {currentImageIndex + 1} / {visibleImages.length}
              </div>
            )}
          </div>

          <div className="feed-post-body">
            <div className="feed-post-topline">
              <span className="feed-type">
                {openedPost.type === 'route'
                  ? 'Маршрут'
                  : openedPost.type === 'moment'
                    ? 'Момент'
                    : 'Место'}
              </span>
              <span className="feed-city-tag">{openedPost.city}</span>
            </div>

            <div className="feed-post-title">{openedPost.title}</div>
            <div className="feed-post-description">{openedPost.description}</div>

            <div className="feed-post-stats">
              <div className="feed-post-stat">
                <div className="feed-post-stat-value">
                  {openedPost.likes + (isLiked ? 1 : 0)}
                </div>
                <div className="feed-post-stat-label">Лайков</div>
              </div>

              <div className="feed-post-stat">
                <div className="feed-post-stat-value">{openedPost.pointsCount ?? '—'}</div>
                <div className="feed-post-stat-label">Точек</div>
              </div>

              <div className="feed-post-stat">
                <div className="feed-post-stat-value">
                  {typeof openedPost.distanceKm !== 'undefined'
                    ? `~${openedPost.distanceKm} км`
                    : '—'}
                </div>
                <div className="feed-post-stat-label">Маршрут</div>
              </div>

              <div className="feed-post-stat">
                <div className="feed-post-stat-value">
                  {openedPost.difficulty ? routeDifficultyLabel(openedPost.difficulty) : '—'}
                </div>
                <div className="feed-post-stat-label">Сложность</div>
              </div>
            </div>

            {openedPost.daysCount !== undefined && (
              <div className="feed-post-meta-extra">
                {openedPost.daysCount}{' '}
                {declension('день', 'дня', 'дней', openedPost.daysCount)}
              </div>
            )}

            {openedPost.previewPoints.length > 0 && (
              <div className="feed-post-points">
                {openedPost.previewPoints.map(point => (
                  <span key={point} className="feed-post-point-chip">
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
                onClick={() => onOpenRoutes(openedPost.city, openedPost.routeId)}
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
      <div className="feed-header">
        <h2>Лента</h2>
        <div className="feed-subtitle">
          Маршруты, достопримечательности и моменты в формате social travel feed
        </div>
      </div>

      <div className="feed-compose-card">
        <div className="feed-compose-left">
          <div className="feed-compose-avatar">🧭</div>
          <div className="feed-compose-actions">
            {onCreateRoute && (
              <button type="button" className="feed-compose-main-btn" onClick={onCreateRoute}>
                Создать маршрут
              </button>
            )}
            {onCreatePlace && (
              <button type="button" className="feed-compose-icon-btn" onClick={onCreatePlace}>
                ＋
              </button>
            )}
            {onCreateMoment && (
              <button type="button" className="feed-compose-icon-btn" onClick={onCreateMoment}>
                ☰
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="feed-list">
        {feedPosts.map(renderCard)}
      </div>

      {renderModal()}
    </div>
  )
}

export default FeedPage