import React, { useEffect, useMemo, useState } from 'react'
import {
  readSavedPostIds,
  readLikedPostIds,
  writeLikedPostIds,
  writeSavedPostIds,
} from '../utils/socialStorage'
import './FeedPage.css'

type Props = {
  onOpenRoutes: (city: string, routeId?: string) => void
  onOpenPlace?: (placeId: string) => void
  onCreateRoute?: () => void
  onCreatePlace?: () => void
  onCreateMoment?: () => void
}

type FeedPostType = 'route' | 'place' | 'moment'

type FeedPost = {
  id: string
  type: FeedPostType
  routeId: string
  placeId?: string
  cityId?: string
  city: string
  cityFolder: string
  title: string
  description: string
  image: string
  images: string[]
  likes: number
  commentsCount?: number
  savesCount?: number
  daysCount?: number
  pointsCount?: number
  difficulty?: string
  distanceKm?: number
  previewPoints: string[]
  createdAt: string
  publishedAt?: string
  authorId?: string
  authorName?: string
  authorAvatarUrl?: string
  dayTitle?: string
  dayIndex?: number
  pointIndex?: number
  score?: number
  routePointId?: string
}

type FeedApiResponse = {
  ok: boolean
  items: FeedPost[]
  limit?: number
  offset?: number
  count?: number
  hasMore?: boolean
  nextOffset?: number | null
}

type PlaceFullPhoto = {
  id: string
  place_id: string
  url: string
  thumb_url?: string | null
  is_cover?: boolean
  sort_order?: number
}

type PlaceFullRoute = {
  id: string
  cityId?: string
  title: string
  slug?: string
  shortDescription?: string
  description?: string
  difficulty?: string
  distanceKm?: number | null
  daysCount?: number | null
  popularity?: number
  coverImage?: string
  authorId?: string
  authorName?: string
  authorAvatarUrl?: string
  firstDayIndex?: number | null
  firstPointIndex?: number | null
  occurrences?: number
}

type PlaceFullData = {
  place: {
    id: string
    cityId?: string
    title: string
    slug?: string
    normalizedTitle?: string
    description?: string
    lat?: number | null
    lon?: number | null
    coverImage?: string
    photosCount?: number
    createdAt?: string
    updatedAt?: string
    authorId?: string
    authorName?: string
    authorAvatarUrl?: string
  }
  photos: PlaceFullPhoto[]
  routes: PlaceFullRoute[]
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000'

const normalizeText = (value?: string): string => {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
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
  if (difficulty === 'easy') return 'Лёгкий'
  return difficulty || 'Лёгкий'
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
    return `${API_BASE_URL}${value}`
  }

  return `${API_BASE_URL}/${value.replace(/^\/+/, '')}`
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

const normalizeFeedPost = (post: FeedPost): FeedPost => {
  const normalizedImages = dedupeImages([
    ...(Array.isArray(post.images) ? post.images : []),
    post.image || '',
  ])

  const fallbackSubtitle =
    post.type === 'route' ? `${post.city} · маршрут` : post.city

  return {
    ...post,
    id: String(post.id || ''),
    type: (post.type || 'place') as FeedPostType,
    routeId: String(post.routeId || ''),
    placeId: post.placeId ? String(post.placeId) : '',
    cityId: post.cityId ? String(post.cityId) : '',
    city: post.city || '',
    cityFolder: post.cityFolder || '',
    title: post.title || 'Без названия',
    description: post.description || '',
    image:
      normalizedImages[0] ||
      createPlaceholderImage(post.title || 'Без названия', fallbackSubtitle),
    images: normalizedImages,
    previewPoints: Array.isArray(post.previewPoints) ? post.previewPoints : [],
    likes: Number(post.likes || 0),
    commentsCount: Number(post.commentsCount || 0),
    savesCount: Number(post.savesCount || 0),
    daysCount: post.daysCount != null ? Number(post.daysCount) : undefined,
    pointsCount: post.pointsCount != null ? Number(post.pointsCount) : undefined,
    distanceKm: post.distanceKm != null ? Number(post.distanceKm) : undefined,
    score: post.score != null ? Number(post.score) : 0,
    createdAt: post.createdAt || new Date().toISOString(),
    publishedAt: post.publishedAt || post.createdAt || new Date().toISOString(),
    authorName:
      post.authorName ||
      (post.type === 'route' ? 'ProGid' : 'Путешественник'),
  }
}

async function fetchFeed(limit = 24, offset = 0): Promise<FeedApiResponse> {
  const url = new URL(`${API_BASE_URL}/api/feed`)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Feed request failed: ${res.status}`)
  }

  const data = (await res.json()) as FeedApiResponse

  if (!data.ok) {
    throw new Error('Feed API returned ok=false')
  }

  return {
    ...data,
    items: Array.isArray(data.items) ? data.items.map(normalizeFeedPost) : [],
  }
}

async function fetchPlaceFull(placeId: string): Promise<PlaceFullData | null> {
  const res = await fetch(`${API_BASE_URL}/api/places/${encodeURIComponent(placeId)}/full`)
  if (!res.ok) return null

  const data = await res.json()
  if (!data?.ok || !data?.data) return null

  return data.data as PlaceFullData
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
  onOpenPlace,
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
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true)
  const [feedError, setFeedError] = useState<string>('')

  const [offset, setOffset] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)

  const [openedPlaceContext, setOpenedPlaceContext] = useState<PlaceFullData | null>(null)
  const [isLoadingPlaceContext, setIsLoadingPlaceContext] = useState(false)

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

  useEffect(() => {
    let cancelled = false

    const loadInitialFeed = async () => {
      setIsLoadingFeed(true)
      setFeedError('')

      try {
        const data = await fetchFeed(24, 0)

        if (cancelled) return

        setFeedPosts(data.items || [])
        setOffset(data.nextOffset ?? (data.items?.length || 0))
        setHasMore(Boolean(data.hasMore))
      } catch (error) {
        console.error('Feed load error:', error)
        if (!cancelled) {
          setFeedPosts([])
          setFeedError('Не удалось загрузить ленту')
          setHasMore(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFeed(false)
        }
      }
    }

    loadInitialFeed()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadPlaceContext = async () => {
      if (!openedPost || openedPost.type !== 'place' || !openedPost.placeId) {
        setOpenedPlaceContext(null)
        setIsLoadingPlaceContext(false)
        return
      }

      setIsLoadingPlaceContext(true)

      try {
        const data = await fetchPlaceFull(openedPost.placeId)
        if (!cancelled) {
          setOpenedPlaceContext(data)
        }
      } catch (error) {
        console.error('Place context load error:', error)
        if (!cancelled) {
          setOpenedPlaceContext(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlaceContext(false)
        }
      }
    }

    loadPlaceContext()

    return () => {
      cancelled = true
    }
  }, [openedPost])

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)

    try {
      const data = await fetchFeed(24, offset)

      setFeedPosts(prev => {
        const merged = [...prev, ...(data.items || [])]
        const seen = new Set<string>()

        return merged.filter(item => {
          const key = item.id
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
      })

      setOffset(data.nextOffset ?? offset)
      setHasMore(Boolean(data.hasMore))
    } catch (error) {
      console.error('Feed loadMore error:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const visibleFeedPosts = useMemo(() => feedPosts, [feedPosts])

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
    const contextImages =
      openedPost?.id === post.id && openedPlaceContext?.photos?.length
        ? openedPlaceContext.photos.map(photo => photo.url || photo.thumb_url || '').filter(Boolean)
        : []

    const source = dedupeImages([
      ...contextImages,
      ...(post.images?.length ? post.images : post.image ? [post.image] : []),
    ])

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
    if (!post.routeId) return
    onOpenRoutes(post.city, post.routeId)
    setOpenedPost(null)
  }

  const openPlaceDirect = (post: FeedPost) => {
    if (!post.placeId) return
    if (onOpenPlace) {
      onOpenPlace(post.placeId)
      setOpenedPost(null)
    } else {
      setOpenedPost(post)
    }
  }

  const openRouteFromPlaceContext = (routeId: string) => {
    if (!openedPost) return
    onOpenRoutes(openedPost.city, routeId)
    setOpenedPost(null)
  }

  const openPrimaryRouteForPlace = (post: FeedPost) => {
    const directRouteId = String(post.routeId || '').trim()
    if (directRouteId) {
      onOpenRoutes(post.city, directRouteId)
      setOpenedPost(null)
      return
    }

    const linkedRouteId = openedPlaceContext?.routes?.[0]?.id
    if (linkedRouteId) {
      onOpenRoutes(post.city, linkedRouteId)
      setOpenedPost(null)
    }
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

    const hasRouteForPlace =
      post.type === 'place' &&
      (Boolean(post.routeId) || Boolean(post.routePointId))

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
                {post.city} · {formatRelativeDate(post.publishedAt || post.createdAt)}
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

            {post.type === 'place' ? (
              <>
                <button
                  type="button"
                  className="feed-icon-btn"
                  onClick={() => openPlaceDirect(post)}
                  disabled={!post.placeId}
                  title="Открыть место"
                >
                  📍
                </button>

                {hasRouteForPlace && (
                  <button
                    type="button"
                    className="feed-icon-btn"
                    onClick={() => openPrimaryRouteForPlace(post)}
                    title="Открыть маршрут"
                  >
                    🧭
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="feed-icon-btn"
                onClick={() => openRouteDirect(post)}
                disabled={!post.routeId}
                title="Открыть маршрут"
              >
                🧭
              </button>
            )}
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
            {typeof post.commentsCount === 'number' && post.commentsCount > 0 && (
              <span className="feed-muted-inline"> · {post.commentsCount} комментариев</span>
            )}
          </div>

          <h3 className="feed-card-title">{post.title}</h3>

          {post.description && (
            <div className="feed-card-description">{post.description}</div>
          )}

          <div className="feed-card-meta-row">
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

            {post.type === 'place' ? (
              <div className="feed-card-inline-actions">
                <button
                  type="button"
                  className="feed-open-route-btn"
                  onClick={() => openPlaceDirect(post)}
                  disabled={!post.placeId}
                >
                  Открыть место
                </button>

                <button
                  type="button"
                  className="feed-open-route-btn secondary"
                  onClick={() => openPrimaryRouteForPlace(post)}
                  disabled={!hasRouteForPlace}
                >
                  Маршрут
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="feed-open-route-btn"
                onClick={() => openRouteDirect(post)}
                disabled={!post.routeId}
              >
                Открыть маршрут
              </button>
            )}
          </div>
        </div>
      </article>
    )
  }

  const renderPlaceRelations = () => {
    if (!openedPost || openedPost.type !== 'place') return null

    if (isLoadingPlaceContext) {
      return <div className="feed-place-relations">Загружаем связи места…</div>
    }

    if (!openedPlaceContext) return null

    const placeAuthor =
      openedPlaceContext.place.authorName ||
      openedPost.authorName ||
      'Путешественник'

    return (
      <div className="feed-place-relations">
        <div className="feed-post-section">
          <div className="feed-post-section-title">Автор места</div>
          <div className="feed-post-section-text">{placeAuthor}</div>
        </div>

        {openedPlaceContext.routes.length > 0 && (
          <div className="feed-post-section">
            <div className="feed-post-section-title">Это место есть в маршрутах</div>
            <div className="feed-linked-routes">
              {openedPlaceContext.routes.map(route => (
                <button
                  key={route.id}
                  type="button"
                  className="feed-linked-route"
                  onClick={() => openRouteFromPlaceContext(route.id)}
                >
                  <div className="feed-linked-route-title">{route.title}</div>
                  <div className="feed-linked-route-meta">
                    {route.authorName || 'Автор'} ·{' '}
                    {route.daysCount ? `${route.daysCount} дн.` : 'маршрут'}
                    {route.distanceKm ? ` · ~${route.distanceKm} км` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderModal = () => {
    if (!openedPost) return null

    const isLiked = likedPostIds.includes(openedPost.id)
    const isSaved = savedPostIds.includes(openedPost.id)

    const hasRouteForPlace =
      openedPost.type === 'place' &&
      (
        Boolean(openedPost.routeId) ||
        Boolean(openedPost.routePointId) ||
        Boolean(openedPlaceContext?.routes?.length)
      )

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
                  {openedPost.city} · {formatRelativeDate(openedPost.publishedAt || openedPost.createdAt)}
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

            {renderPlaceRelations()}

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

              {openedPost.type === 'place' ? (
                <>
                  <button
                    type="button"
                    className="feed-open-route-btn"
                    onClick={() => openPlaceDirect(openedPost)}
                    disabled={!openedPost.placeId}
                  >
                    Открыть место
                  </button>

                  <button
                    type="button"
                    className="feed-open-route-btn secondary"
                    onClick={() => openPrimaryRouteForPlace(openedPost)}
                    disabled={!hasRouteForPlace}
                  >
                    Открыть маршрут
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="feed-open-route-btn"
                  onClick={() => openRouteDirect(openedPost)}
                  disabled={!openedPost.routeId}
                >
                  Открыть маршрут
                </button>
              )}
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
          <div className="feed-state-message">Загружаем ленту…</div>
        )}

        {!isLoadingFeed && feedError && (
          <div className="feed-state-message error">{feedError}</div>
        )}

        {!isLoadingFeed && !feedError && visibleFeedPosts.length === 0 && (
          <div className="feed-state-message">В ленте пока нет публикаций</div>
        )}

        <div className="feed-list">
          {visibleFeedPosts.map(renderCard)}
        </div>

        {!isLoadingFeed && !feedError && hasMore && (
          <div className="feed-load-more-wrap">
            <button
              type="button"
              className="feed-open-route-btn"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Загружаем…' : 'Показать ещё'}
            </button>
          </div>
        )}
      </div>

      {renderModal()}
    </div>
  )
}

export default FeedPage