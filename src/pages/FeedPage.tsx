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
}

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

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

const getRouteImages = (route: PopularRoute): string[] => {
  const localImages: string[] = []

  if ((route as any).coverImage) {
    localImages.push((route as any).coverImage as string)
  }

  if (Array.isArray((route as any).images)) {
    localImages.push(...((route as any).images as string[]))
  }

  const uniq = Array.from(new Set(localImages.filter(Boolean)))

  if (uniq.length > 0) return uniq

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
    const routeImages = getRouteImages(route)
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

        if (seenPlaces.has(placeKey)) {
          return
        }
        seenPlaces.add(placeKey)

        const pointImages =
          Array.isArray(point.images) && point.images.length > 0
            ? Array.from(new Set(point.images.filter(Boolean)))
            : routeImages

        posts.push({
          id: `place_${route.id}_${dayIndex}_${pointIndex}_${normalizeText(point.title)}`,
          type: 'place',
          routeId: route.id,
          city: route.city,
          cityFolder,
          title: point.title || 'Место',
          description: point.description || 'Интересное место маршрута',
          image: pointImages[0] || routeImages[0] || '',
          images: pointImages.length > 0 ? pointImages : routeImages,
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

  useEffect(() => {
    setLikedPostIds(readLikedPostIds())
    setSavedPostIds(readSavedPostIds())
  }, [])

  const feedPosts = useMemo(() => buildFeedPosts(), [])

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

  return (
    <div className="feed-page">
      <div className="feed-page-header">
        <div className="feed-page-topline">
          Маршруты, достопримечательности и моменты в формате social travel feed
        </div>

        <div className="feed-page-actions">
          {onCreateRoute && (
            <button type="button" className="feed-create-btn" onClick={onCreateRoute}>
              Создать маршрут
            </button>
          )}

          {onCreatePlace && (
            <button type="button" className="feed-create-btn" onClick={onCreatePlace}>
              Добавить место
            </button>
          )}

          {onCreateMoment && (
            <button type="button" className="feed-create-btn" onClick={onCreateMoment}>
              Добавить момент
            </button>
          )}
        </div>
      </div>

      <div className="feed-list">
        {feedPosts.map(post => {
          const visibleImages = getVisibleImages(post)
          const currentImageIndex = getPostImageIndex(post.id, visibleImages.length)
          const currentImage = visibleImages[currentImageIndex] || ''

          const isLiked = likedPostIds.includes(post.id)
          const isSaved = savedPostIds.includes(post.id)

          return (
            <article key={post.id} className="feed-card">
              <div className="feed-card-media">
                <div className="feed-card-badge-left">
                  {post.type === 'route'
                    ? 'Маршрут'
                    : post.type === 'moment'
                      ? 'Момент'
                      : 'Место'}
                </div>

                <div className="feed-card-badge-right">{post.city}</div>

                {visibleImages.length > 1 && (
                  <button
                    type="button"
                    className="feed-card-arrow left"
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
                    className="feed-card-image"
                    onError={() => {
                      setFailedImages(prev => ({
                        ...prev,
                        [`${post.id}_${currentImage}`]: true,
                      }))
                    }}
                  />
                ) : (
                  <div className="feed-card-image-placeholder">Нет фото</div>
                )}

                {visibleImages.length > 1 && (
                  <button
                    type="button"
                    className="feed-card-arrow right"
                    onClick={e => {
                      e.stopPropagation()
                      showNextPostImage(post.id, visibleImages.length)
                    }}
                  >
                    ›
                  </button>
                )}

                {visibleImages.length > 1 && (
                  <div className="feed-card-counter">
                    {currentImageIndex + 1} / {visibleImages.length}
                  </div>
                )}
              </div>

              <div className="feed-card-content">
                <h3 className="feed-card-title">{post.title}</h3>

                <div className="feed-card-description">{post.description}</div>

                {post.type === 'place' && post.route?.title && (
                  <div className="feed-card-route-line">
                    Из маршрута: {post.route.title}
                  </div>
                )}

                <div className="feed-card-tags">
                  {post.route?.title && (
                    <span className="feed-card-tag">{post.route.title}</span>
                  )}

                  {post.dayTitle && (
                    <span className="feed-card-tag">{post.dayTitle}</span>
                  )}

                  {typeof post.daysCount !== 'undefined' && post.type === 'route' && (
                    <span className="feed-card-tag">
                      {post.daysCount}{' '}
                      {declension('день', 'дня', 'дней', post.daysCount)}
                    </span>
                  )}

                  {typeof post.distanceKm !== 'undefined' && (
                    <span className="feed-card-tag">~ {post.distanceKm} км</span>
                  )}

                  {post.difficulty && (
                    <span className="feed-card-tag">
                      {routeDifficultyLabel(post.difficulty)}
                    </span>
                  )}
                </div>

                <div className="feed-card-actions">
                  <button
                    type="button"
                    className={`feed-action-btn ${isLiked ? 'active' : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    ❤️ {post.likes + (isLiked ? 1 : 0)}
                  </button>

                  <button
                    type="button"
                    className={`feed-action-btn ${isSaved ? 'active' : ''}`}
                    onClick={() => toggleSave(post.id)}
                  >
                    🔖 Сохранить
                  </button>

                  <button
                    type="button"
                    className="feed-open-btn"
                    onClick={() => onOpenRoutes(post.city, post.routeId)}
                  >
                    Открыть
                  </button>
                </div>

                {visibleImages.length > 1 && (
                  <div className="feed-card-dots">
                    {visibleImages.map((img, idx) => (
                      <button
                        key={`${post.id}_${img}_${idx}`}
                        type="button"
                        className={
                          idx === currentImageIndex
                            ? 'feed-card-dot active'
                            : 'feed-card-dot'
                        }
                        onClick={e => {
                          e.stopPropagation()
                          setPostImageIndex(post.id, idx)
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default FeedPage