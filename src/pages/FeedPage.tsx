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

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://progid-backend.vercel.app'

const MAX_CLOUD_POINT_IMAGES = 8

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

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
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

const probeImageUrl = (url: string): Promise<boolean> => {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

const loadCloudPointImages = async (
  cityFolder: string,
  routeId: string,
  dayIndex: number,
  pointIndex: number,
  title?: string
): Promise<string[]> => {
  const exactUrls: string[] = []
  const exactPrefix = buildExactCloudPrefix(cityFolder, routeId, dayIndex, pointIndex, title)

  for (let i = 1; i <= MAX_CLOUD_POINT_IMAGES; i++) {
    const url = `${exactPrefix}/image-${i}.jpg`
    const ok = await probeImageUrl(url)
    if (ok) exactUrls.push(url)
  }

  if (exactUrls.length > 0) return exactUrls

  const legacyUrls: string[] = []
  const legacyPrefix = buildLegacyCloudPrefix(cityFolder, routeId, pointIndex)

  for (let i = 1; i <= MAX_CLOUD_POINT_IMAGES; i++) {
    const url = `${legacyPrefix}/image-${i}.jpg`
    const ok = await probeImageUrl(url)
    if (ok) legacyUrls.push(url)
  }

  return legacyUrls
}

const extractPhotosFromApi = (data: any): string[] => {
  if (!data || typeof data !== 'object') return []

  const candidates: unknown[] = [data.photos, data.publicUrls, data.urls, data.images]

  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.filter((v): v is string => typeof v === 'string')
    }
  }

  if (Array.isArray(data.items)) {
    const collected: string[] = []
    for (const it of data.items) {
      if (!it || typeof it !== 'object') continue
      if (typeof it.url === 'string') collected.push(it.url)
      else if (typeof it.publicUrl === 'string') collected.push(it.publicUrl)
    }
    if (collected.length > 0) return collected
  }

  return []
}

const withTimeout = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 30000
) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

const safeJson = async (res: Response) => {
  const text = await res.text()
  try {
    return {
      ok: true,
      data: JSON.parse(text),
      text,
    }
  } catch {
    return {
      ok: false,
      data: null,
      text,
    }
  }
}

const getRouteOwnImages = (route: PopularRoute): string[] => {
  const localImages: string[] = []

  if ((route as any).coverImage) {
    localImages.push((route as any).coverImage as string)
  }

  if (Array.isArray((route as any).images)) {
    localImages.push(...((route as any).images as string[]))
  }

  return Array.from(new Set(localImages.filter(Boolean)))
}

const getRouteFallbackImages = (route: PopularRoute): string[] => {
  const ownImages = getRouteOwnImages(route)
  if (ownImages.length > 0) return ownImages

  const cityFolder = normalizeCityFolder(route.city || '')
  if (cityFolder) {
    return [`${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`]
  }

  return []
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
    const routeOwnImages = getRouteOwnImages(route)
    const routeFallbackImages = getRouteFallbackImages(route)
    const previewPoints = buildRoutePreview(route)
    const pointsCount = countRoutePoints(route)
    const cityFolder = normalizeCityFolder(route.city || '')

    posts.push({
      id: `route_${route.id}_${buildRouteSemanticKey(route)}`,
      type: 'route',
      routeId: route.id,
      city: route.city,
      cityFolder,
      title: route.title,
      description: route.shortDescription || 'Готовый маршрут по городу',
      image: routeFallbackImages[0] || '',
      images: routeFallbackImages,
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

        const pointImages =
          Array.isArray(point.images) && point.images.length > 0
            ? Array.from(new Set(point.images.filter(Boolean)))
            : []

        posts.push({
          id: `place_${route.id}_${dayIndex}_${pointIndex}_${normalizeText(point.title)}`,
          type: 'place',
          routeId: route.id,
          city: route.city,
          cityFolder,
          title: point.title || 'Место',
          description: point.description || 'Интересное место маршрута',
          image: pointImages[0] || routeFallbackImages[0] || '',
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
  const [resolvedPostImages, setResolvedPostImages] = useState<Record<string, string[]>>({})

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

  const feedPosts = useMemo(() => buildFeedPosts(), [])

  useEffect(() => {
    let cancelled = false

    const loadImagesForPosts = async () => {
      const nextResolved: Record<string, string[]> = {}

      for (const post of feedPosts) {
        if (cancelled) return

        if (post.type === 'route') {
          // Для маршрута: собираем фото СО ВСЕГО МАРШРУТА
          const collected: string[] = []

          const routeOwnImages = getRouteOwnImages(post.route)
          collected.push(...routeOwnImages)

          for (const day of post.route.days) {
            for (let pointIndex = 0; pointIndex < day.points.length; pointIndex++) {
              const point = day.points[pointIndex]
              if (!point?.title?.trim()) continue

              if (Array.isArray(point.images) && point.images.length > 0) {
                collected.push(...point.images.filter(Boolean))
                continue
              }

              try {
                const cloudImages = await loadCloudPointImages(
                  post.cityFolder,
                  post.route.id,
                  post.route.days.indexOf(day),
                  pointIndex,
                  point.title
                )
                if (cloudImages.length > 0) {
                  collected.push(...cloudImages)
                  continue
                }
              } catch (e) {
                console.error('route cloud images error', post.id, point.title, e)
              }

              try {
                const params = new URLSearchParams({
                  routeId: post.route.id,
                  dayIndex: String(post.route.days.indexOf(day)),
                  pointIndex: String(pointIndex),
                  city: post.city,
                  title: point.title || '',
                })

                const photoUrls = [
                  `${API_BASE}/api/photos?${params.toString()}`,
                  `${API_BASE}/photos?${params.toString()}`,
                ]

                let found = false

                for (const url of photoUrls) {
                  try {
                    const resp = await withTimeout(
                      url,
                      {
                        method: 'GET',
                        headers: { Accept: 'application/json' },
                      },
                      12000
                    )

                    if (!resp.ok) continue

                    const parsed = await safeJson(resp)
                    if (!parsed.ok) continue

                    const photos = extractPhotosFromApi(parsed.data)
                    if (photos.length > 0) {
                      collected.push(...photos)
                      found = true
                      break
                    }
                  } catch (e) {
                    console.error('route /photos error', url, e)
                  }
                }

                if (found) continue
              } catch (e) {
                console.error('route backend images error', post.id, point.title, e)
              }
            }
          }

          const uniqRouteImages = Array.from(new Set(collected.filter(Boolean)))
          nextResolved[post.id] =
            uniqRouteImages.length > 0 ? uniqRouteImages : getRouteFallbackImages(post.route)
          continue
        }

        if (post.type === 'place') {
          // Для достопримечательности: только её фото
          const collected: string[] = []

          if (post.images?.length) {
            collected.push(...post.images)
          }

          const dayIndex = post.dayIndex
          const pointIndex = post.pointIndex

          if (
            collected.length === 0 &&
            typeof dayIndex === 'number' &&
            typeof pointIndex === 'number'
          ) {
            try {
              const cloudImages = await loadCloudPointImages(
                post.cityFolder,
                post.route.id,
                dayIndex,
                pointIndex,
                post.title
              )
              if (cloudImages.length > 0) {
                collected.push(...cloudImages)
              }
            } catch (e) {
              console.error('place cloud images error', post.id, e)
            }
          }

          if (
            collected.length === 0 &&
            typeof dayIndex === 'number' &&
            typeof pointIndex === 'number'
          ) {
            try {
              const params = new URLSearchParams({
                routeId: post.route.id,
                dayIndex: String(dayIndex),
                pointIndex: String(pointIndex),
                city: post.city,
                title: post.title,
              })

              const photoUrls = [
                `${API_BASE}/api/photos?${params.toString()}`,
                `${API_BASE}/photos?${params.toString()}`,
              ]

              let found = false

              for (const url of photoUrls) {
                try {
                  const resp = await withTimeout(
                    url,
                    {
                      method: 'GET',
                      headers: { Accept: 'application/json' },
                    },
                    12000
                  )

                  if (!resp.ok) continue

                  const parsed = await safeJson(resp)
                  if (!parsed.ok) continue

                  const photos = extractPhotosFromApi(parsed.data)
                  if (photos.length > 0) {
                    collected.push(...photos)
                    found = true
                    break
                  }
                } catch (e) {
                  console.error('place /photos error', url, e)
                }
              }

              if (!found) {
                const parseUrls = [`${API_BASE}/api/parse`, `${API_BASE}/parse`]

                for (const url of parseUrls) {
                  try {
                    const resp = await withTimeout(
                      url,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Accept: 'application/json',
                        },
                        body: JSON.stringify({
                          routeId: post.route.id,
                          dayIndex,
                          pointIndex,
                          city: post.city,
                          title: post.title,
                          limit: 6,
                        }),
                      },
                      60000
                    )

                    if (!resp.ok) continue

                    const parsed = await safeJson(resp)
                    if (!parsed.ok) continue

                    const photos = extractPhotosFromApi(parsed.data)
                    if (photos.length > 0) {
                      collected.push(...photos)
                      break
                    }
                  } catch (e) {
                    console.error('place /parse error', url, e)
                  }
                }
              }
            } catch (e) {
              console.error('place backend images error', post.id, e)
            }
          }

          const uniqPlaceImages = Array.from(new Set(collected.filter(Boolean)))
          nextResolved[post.id] =
            uniqPlaceImages.length > 0
              ? uniqPlaceImages
              : getRouteFallbackImages(post.route)
          continue
        }

        // Для обычного поста / moment: только фото самого поста
        nextResolved[post.id] =
          post.images?.length > 0
            ? Array.from(new Set(post.images.filter(Boolean)))
            : post.image
              ? [post.image]
              : []
      }

      if (!cancelled) {
        setResolvedPostImages(nextResolved)
      }
    }

    loadImagesForPosts()

    return () => {
      cancelled = true
    }
  }, [feedPosts])

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
    const source = resolvedPostImages[post.id] || post.images || (post.image ? [post.image] : [])
    return source.filter(img => img && !failedImages[`${post.id}_${img}`])
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
                <div className="feed-post-stat-value">{openedPost.likes + (isLiked ? 1 : 0)}</div>
                <div className="feed-post-stat-label">Лайков</div>
              </div>

              <div className="feed-post-stat">
                <div className="feed-post-stat-value">{openedPost.pointsCount ?? '—'}</div>
                <div className="feed-post-stat-label">Точек</div>
              </div>

              <div className="feed-post-stat">
                <div className="feed-post-stat-value">
                  {typeof openedPost.distanceKm !== 'undefined' ? `~${openedPost.distanceKm} км` : '—'}
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