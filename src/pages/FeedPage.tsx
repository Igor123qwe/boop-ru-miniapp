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
  dayTitle?: string
  dayIndex?: number
  pointIndex?: number
  score?: number
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
  return 'Лёгкий'
}

const resolveImageUrl = (url?: string): string => {
  const value = String(url || '').trim()
  if (!value) return ''

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:image/')
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
    routeId: post.routeId || '',
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
  }
}

async function fetchFeed(): Promise<FeedPost[]> {
  const url = new URL(`${API_BASE_URL}/api/feed`)
  url.searchParams.set('limit', '50')
  url.searchParams.set('offset', '0')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Feed request failed: ${res.status}`)
  }

  const data = (await res.json()) as FeedApiResponse

  if (!data.ok) {
    throw new Error('Feed API returned ok=false')
  }

  return Array.isArray(data.items) ? data.items.map(normalizeFeedPost) : []
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
  const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(true)
  const [feedError, setFeedError] = useState<string>('')

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

    const loadFeed = async () => {
      setIsLoadingFeed(true)
      setFeedError('')

      try {
        const items = await fetchFeed()
        if (!cancelled) {
          setFeedPosts(items)
        }
      } catch (error) {
        console.error('Feed load error:', error)
        if (!cancelled) {
          setFeedPosts([])
          setFeedError('Не удалось загрузить ленту')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFeed(false)
        }
      }
    }

    loadFeed()

    return () => {
      cancelled = true
    }
  }, [])

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

  const visibleFeedPosts = useMemo(() => {
    return feedPosts
  }, [feedPosts])

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
            {post.dayTitle && <span>{post.dayTitle}</span>}
            {typeof post.distanceKm !== 'undefined' && <span>~ {post.distanceKm} км</span>}
            {post.difficulty && <span>{routeDifficultyLabel(post.difficulty)}</span>}
          </div>

          {post.previewPoints.length > 0 && post.type === 'route' && (
            <div className="feed-preview-points">
              {post.previewPoints.map(point => (
                <span key={`${post.id}_${normalizeText(point)}`} className="feed-preview-point">
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
                onOpenRoutes(post.city, post.routeId || undefined)
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
                  <span key={`${openedPost.id}_${normalizeText(point)}`} className="feed-post-point-chip">
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
                onClick={() => onOpenRoutes(openedPost.city, openedPost.routeId || undefined)}
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

      {isLoadingFeed && (
        <div style={{ padding: '12px 4px 20px', color: '#64748b' }}>
          Загружаем ленту…
        </div>
      )}

      {!isLoadingFeed && feedError && (
        <div style={{ padding: '12px 4px 20px', color: '#dc2626' }}>
          {feedError}
        </div>
      )}

      {!isLoadingFeed && !feedError && visibleFeedPosts.length === 0 && (
        <div style={{ padding: '12px 4px 20px', color: '#64748b' }}>
          В ленте пока нет публикаций
        </div>
      )}

      <div className="feed-list">
        {visibleFeedPosts.map(renderCard)}
      </div>

      {renderModal()}
    </div>
  )
}

export default FeedPage