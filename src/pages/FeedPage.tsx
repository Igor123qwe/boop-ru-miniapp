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
}

type FeedPost = {
  id: string
  routeId: string
  city: string
  cityFolder: string
  title: string
  description: string
  image: string
  likes: number
  daysCount: number
  pointsCount: number
  difficulty?: string
  distanceKm?: number
  previewPoints: string[]
  route: PopularRoute
  createdAt: string
}

const FEED_LIKES_KEY = 'progid_feed_likes_map'
const FEED_IMAGE_CACHE_KEY = 'progid_feed_image_cache_v2'
const LOCAL_TRIPS_KEY = 'progid_my_trips'

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://progid-backend.vercel.app'

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const MAX_CLOUD_POINT_IMAGES = 8

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

const getCityCoverUrl = (cityFolder: string): string =>
  `${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`

const routeDifficultyLabel = (difficulty?: string): string => {
  if (difficulty === 'medium') return 'Средний'
  if (difficulty === 'hard') return 'Сложный'
  return 'Лёгкий'
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

const isUtilityPoint = (title?: string): boolean => {
  const t = (title || '').toLowerCase().trim()
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

const countRoutePoints = (route: PopularRoute): number => {
  return route.days.reduce((sum, day) => sum + day.points.length, 0)
}

const buildRoutePreview = (route: PopularRoute): string[] => {
  const points: string[] = []

  for (const day of route.days) {
    for (const point of day.points) {
      const title = point.title?.trim()
      if (!title || isUtilityPoint(title)) continue
      if (!points.includes(title)) points.push(title)
      if (points.length >= 4) return points
    }
  }

  return points
}

const buildRouteDescription = (route: PopularRoute): string => {
  if (route.shortDescription?.trim()) return route.shortDescription.trim()

  const preview = buildRoutePreview(route)
  if (preview.length > 0) {
    return preview.join(', ')
  }

  return 'Готовый маршрут по городу с удобной последовательностью мест.'
}

const hasOwnCoverImage = (route: PopularRoute): boolean => {
  const coverImage = (route as any).coverImage as string | undefined
  const images = (route as any).images as string[] | undefined
  return !!coverImage || (Array.isArray(images) && images.length > 0)
}

const getInitialRouteCoverImage = (
  route: PopularRoute,
  cityFolder: string,
  imageCache: Record<string, string>
): string => {
  const cached = imageCache[route.id]
  if (cached) return cached

  const coverImage = (route as any).coverImage as string | undefined
  const images = (route as any).images as string[] | undefined

  if (coverImage) return coverImage
  if (Array.isArray(images) && images.length > 0) return images[0]

  return getCityCoverUrl(cityFolder)
}

const readLikesMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(FEED_LIKES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeLikesMap = (map: Record<string, number>) => {
  localStorage.setItem(FEED_LIKES_KEY, JSON.stringify(map))
}

const readImageCache = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(FEED_IMAGE_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeImageCache = (map: Record<string, string>) => {
  localStorage.setItem(FEED_IMAGE_CACHE_KEY, JSON.stringify(map))
}

const saveRouteToMyTrips = (route: PopularRoute, image: string) => {
  const now = new Date().toISOString()

  const savedTrip = {
    id: `${route.id}_${route.city}`,
    city: route.city,
    routeId: route.id,
    title: route.title,
    shortDescription: route.shortDescription,
    daysCount: route.daysCount,
    difficulty: route.difficulty,
    distanceKm: route.distanceKm,
    estimatedBudget: (route as any).estimatedBudget,
    season: (route as any).season,
    coverImage: image,
    hiddenPoints: {},
    extraPoints: {},
    routeSnapshot: route,
    createdAt: now,
    updatedAt: now,
  }

  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY)
    const current = raw ? JSON.parse(raw) : []
    const arr = Array.isArray(current) ? current : []

    const existingIndex = arr.findIndex(
      (item: any) => item.routeId === savedTrip.routeId && item.city === savedTrip.city
    )

    if (existingIndex >= 0) {
      arr[existingIndex] = {
        ...arr[existingIndex],
        ...savedTrip,
        createdAt: arr[existingIndex].createdAt,
        updatedAt: now,
      }
    } else {
      arr.unshift(savedTrip)
    }

    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(arr))
  } catch {
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify([savedTrip]))
  }
}

const probeImageUrl = (url: string): Promise<boolean> => {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
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

const loadCloudPointImages = async (
  cityFolder: string,
  routeId: string,
  pointIndex: number
): Promise<string[]> => {
  const goodUrls: string[] = []

  for (let i = 1; i <= MAX_CLOUD_POINT_IMAGES; i++) {
    const url = `${CLOUD_BASE_URL}/${cityFolder}/${routeId}/point_${pointIndex}/image-${i}.jpg`
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeImageUrl(url)
    if (ok) goodUrls.push(url)
  }

  return goodUrls
}

const findFirstMeaningfulPoint = (
  route: PopularRoute
): { pointIndex: number; title: string } | null => {
  let globalIndex = 0

  for (const day of route.days) {
    for (const point of day.points) {
      const title = point.title?.trim() || ''
      if (!isUtilityPoint(title)) {
        return { pointIndex: globalIndex, title }
      }
      globalIndex += 1
    }
  }

  return null
}

const resolveRouteImage = async (
  route: PopularRoute,
  cityFolder: string
): Promise<string | null> => {
  const point = findFirstMeaningfulPoint(route)
  if (!point) return null

  try {
    const cloudPhotos = await loadCloudPointImages(cityFolder, route.id, point.pointIndex)
    if (cloudPhotos.length > 0) return cloudPhotos[0]
  } catch {
    // ignore
  }

  try {
    const params = new URLSearchParams({
      routeId: route.id,
      pointIndex: String(point.pointIndex),
      city: route.city,
      title: point.title,
    })

    const resp = await fetch(`${API_BASE}/api/photos?${params.toString()}`)
    if (!resp.ok) return null

    const data = await resp.json()
    const photos = extractPhotosFromApi(data)
    if (photos.length > 0) return photos[0]
  } catch {
    // ignore
  }

  return null
}

export const FeedPage: React.FC<Props> = ({ onOpenRoutes, onCreateRoute }) => {
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [likesMap, setLikesMap] = useState<Record<string, number>>({})
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [activePost, setActivePost] = useState<FeedPost | null>(null)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({})
  const [saveToast, setSaveToast] = useState('')

  useEffect(() => {
    setLikedIds(readLikedPostIds())
    setSavedIds(readSavedPostIds())
    setLikesMap(readLikesMap())
    setImageCache(readImageCache())
  }, [])

  useEffect(() => {
    if (!saveToast) return
    const timer = setTimeout(() => setSaveToast(''), 2200)
    return () => clearTimeout(timer)
  }, [saveToast])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    if (activePost) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [activePost])

  const posts = useMemo<FeedPost[]>(() => {
    const allRoutes = Object.values(POPULAR_ROUTES).flat()

    return allRoutes
      .map((route, index) => {
        const cityFolder = normalizeCityFolder(route.city)
        const id = `route_post_${route.id}`
        const pointsCount = countRoutePoints(route)
        const previewPoints = buildRoutePreview(route)
        const baseLikes = typeof route.popularity === 'number' ? route.popularity : 0
        const likes = likesMap[id] ?? Math.max(6, Math.round(baseLikes / 8) || index + 7)

        return {
          id,
          routeId: route.id,
          city: route.city,
          cityFolder,
          title: route.title,
          description: buildRouteDescription(route),
          image: getInitialRouteCoverImage(route, cityFolder, imageCache),
          likes,
          daysCount: route.daysCount,
          pointsCount,
          difficulty: route.difficulty,
          distanceKm: route.distanceKm,
          previewPoints,
          route,
          createdAt: new Date(Date.now() - index * 1000 * 60 * 60 * 5).toISOString(),
        }
      })
      .sort((a, b) => {
        const aScore = (a.route.popularity ?? 0) + a.likes
        const bScore = (b.route.popularity ?? 0) + b.likes
        return bScore - aScore
      })
  }, [likesMap, imageCache])

  const visiblePosts = useMemo(() => {
    return posts.filter(post => !failedImages[post.image])
  }, [posts, failedImages])

  const toggleLike = (postId: string) => {
    const isLiked = likedIds.includes(postId)
    const nextLikedIds = isLiked
      ? likedIds.filter(id => id !== postId)
      : [...likedIds, postId]

    const currentLikes = likesMap[postId] ?? posts.find(p => p.id === postId)?.likes ?? 0
    const nextLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
    const nextLikesMap = {
      ...likesMap,
      [postId]: nextLikes,
    }

    setLikedIds(nextLikedIds)
    setLikesMap(nextLikesMap)
    writeLikedPostIds(nextLikedIds)
    writeLikesMap(nextLikesMap)
  }

  const toggleSave = (postId: string) => {
    const isSaved = savedIds.includes(postId)
    const nextSavedIds = isSaved
      ? savedIds.filter(id => id !== postId)
      : [...savedIds, postId]

    setSavedIds(nextSavedIds)
    writeSavedPostIds(nextSavedIds)
  }

  const handleSaveTrip = (post: FeedPost) => {
    saveRouteToMyTrips(post.route, post.image)
    toggleSave(post.id)
    setSaveToast('Маршрут сохранён в «Мои поездки»')
  }

  const tryResolvePostImage = async (post: FeedPost) => {
    if (loadingImages[post.routeId]) return

    const routeHasOwnImage = hasOwnCoverImage(post.route)
    const currentCached = imageCache[post.routeId]
    const currentImage = currentCached || post.image
    const currentIsCityCover = currentImage === getCityCoverUrl(post.cityFolder)

    if (routeHasOwnImage && !currentIsCityCover) return
    if (currentCached && !currentIsCityCover) return

    setLoadingImages(prev => ({ ...prev, [post.routeId]: true }))

    try {
      const resolved = await resolveRouteImage(post.route, post.cityFolder)
      if (!resolved) return

      const next = {
        ...imageCache,
        [post.routeId]: resolved,
      }

      setImageCache(next)
      writeImageCache(next)

      setActivePost(prev => {
        if (!prev || prev.routeId !== post.routeId) return prev
        return {
          ...prev,
          image: resolved,
        }
      })
    } finally {
      setLoadingImages(prev => ({ ...prev, [post.routeId]: false }))
    }
  }

  const handleOpenPost = async (post: FeedPost) => {
    setActivePost(post)
    await tryResolvePostImage(post)
  }

  return (
    <div className="feed-page">
      {saveToast && <div className="feed-toast">{saveToast}</div>}

      <div className="feed-compose-card">
        <div className="feed-compose-left">
          <div className="feed-compose-avatar">🧭</div>

          <button
            type="button"
            className="feed-compose-main-btn"
            onClick={() => onCreateRoute?.()}
          >
            + Добавить маршрут
          </button>
        </div>

        <div className="feed-compose-actions">
          <button
            type="button"
            className="feed-compose-icon-btn"
            title="Создать маршрут"
            onClick={() => onCreateRoute?.()}
          >
            ＋
          </button>

          <button
            type="button"
            className="feed-compose-icon-btn"
            title="Открыть маршруты"
            onClick={() => onOpenRoutes('Калининград')}
          >
            ☰
          </button>
        </div>
      </div>

      <div className="feed-header">
        <h2>Лента</h2>
        <div className="feed-subtitle">
          Маршруты, подборки и идеи поездок в формате social travel feed
        </div>
      </div>

      <div className="feed-list">
        {visiblePosts.map(post => {
          const isLiked = likedIds.includes(post.id)
          const isSaved = savedIds.includes(post.id)
          const isImageLoading = loadingImages[post.routeId]

          return (
            <button
              key={post.id}
              type="button"
              className="feed-card"
              onClick={() => handleOpenPost(post)}
            >
              <div className="feed-image-wrap">
                <img
                  src={post.image}
                  alt={post.title}
                  className="feed-image"
                  onError={() => {
                    setFailedImages(prev => ({ ...prev, [post.image]: true }))
                  }}
                />

                <div className="feed-image-overlay">
                  <span className="feed-image-chip">Маршрут</span>
                  <span className="feed-image-chip">{post.city}</span>
                </div>

                {isImageLoading && (
                  <div className="feed-image-loader">Подбираем фото маршрута…</div>
                )}
              </div>

              <div className="feed-content">
                <div className="feed-title">{post.title}</div>
                <div className="feed-description">{post.description}</div>

                <div className="feed-meta-line">
                  <span>
                    {post.daysCount} {declension('день', 'дня', 'дней', post.daysCount)}
                  </span>
                  <span>•</span>
                  <span>{post.pointsCount} точек</span>
                  <span>•</span>
                  <span>{routeDifficultyLabel(post.difficulty)}</span>
                  {typeof post.distanceKm !== 'undefined' && (
                    <>
                      <span>•</span>
                      <span>~{post.distanceKm} км</span>
                    </>
                  )}
                </div>

                {post.previewPoints.length > 0 && (
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
                    className={isLiked ? 'feed-action-btn active' : 'feed-action-btn'}
                    onClick={e => {
                      e.stopPropagation()
                      toggleLike(post.id)
                    }}
                  >
                    ❤️ {likesMap[post.id] ?? post.likes}
                  </button>

                  <button
                    type="button"
                    className={isSaved ? 'feed-action-btn active' : 'feed-action-btn'}
                    onClick={e => {
                      e.stopPropagation()
                      handleSaveTrip(post)
                    }}
                  >
                    🔖 {isSaved ? 'Сохранено' : 'Сохранить'}
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
              </div>
            </button>
          )
        })}
      </div>

      {activePost && (
        <div
          className="feed-post-backdrop"
          onClick={() => setActivePost(null)}
        >
          <div
            className="feed-post-modal"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className="feed-post-close"
              onClick={() => setActivePost(null)}
            >
              ✕
            </button>

            <div className="feed-post-image-wrap">
              {!failedImages[activePost.image] && (
                <img
                  src={activePost.image}
                  alt={activePost.title}
                  className="feed-post-image"
                  onError={() => {
                    setFailedImages(prev => ({ ...prev, [activePost.image]: true }))
                  }}
                />
              )}

              {loadingImages[activePost.routeId] && (
                <div className="feed-post-image-loader">
                  Ищем более подходящее фото маршрута…
                </div>
              )}
            </div>

            <div className="feed-post-body">
              <div className="feed-post-topline">
                <span className="feed-type">Маршрут</span>
                <span className="feed-city-tag">{activePost.city}</span>
              </div>

              <div className="feed-post-title">{activePost.title}</div>
              <div className="feed-post-description">{activePost.description}</div>

              <div className="feed-post-stats">
                <div className="feed-post-stat">
                  <div className="feed-post-stat-value">{activePost.daysCount}</div>
                  <div className="feed-post-stat-label">
                    {declension('день', 'дня', 'дней', activePost.daysCount)}
                  </div>
                </div>

                <div className="feed-post-stat">
                  <div className="feed-post-stat-value">{activePost.pointsCount}</div>
                  <div className="feed-post-stat-label">точек</div>
                </div>

                <div className="feed-post-stat">
                  <div className="feed-post-stat-value">
                    {routeDifficultyLabel(activePost.difficulty)}
                  </div>
                  <div className="feed-post-stat-label">сложность</div>
                </div>

                <div className="feed-post-stat">
                  <div className="feed-post-stat-value">
                    {typeof activePost.distanceKm !== 'undefined'
                      ? `~${activePost.distanceKm}`
                      : '—'}
                  </div>
                  <div className="feed-post-stat-label">км</div>
                </div>
              </div>

              {activePost.previewPoints.length > 0 && (
                <div className="feed-post-points">
                  {activePost.previewPoints.map(point => (
                    <span key={point} className="feed-post-point-chip">
                      {point}
                    </span>
                  ))}
                </div>
              )}

              <div className="feed-post-actions">
                <button
                  type="button"
                  className={
                    likedIds.includes(activePost.id)
                      ? 'feed-action-btn active'
                      : 'feed-action-btn'
                  }
                  onClick={() => toggleLike(activePost.id)}
                >
                  ❤️ {likesMap[activePost.id] ?? activePost.likes}
                </button>

                <button
                  type="button"
                  className={
                    savedIds.includes(activePost.id)
                      ? 'feed-action-btn active'
                      : 'feed-action-btn'
                  }
                  onClick={() => handleSaveTrip(activePost)}
                >
                  🔖 {savedIds.includes(activePost.id) ? 'Сохранено' : 'Сохранить'}
                </button>

                <button
                  type="button"
                  className="feed-open-route-btn"
                  onClick={() => {
                    setActivePost(null)
                    onOpenRoutes(activePost.city, activePost.routeId)
                  }}
                >
                  Открыть маршрут
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}