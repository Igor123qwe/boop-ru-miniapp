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
  onOpenPlace?: (placeId: string) => void
  onCreateRoute?: () => void
  onCreatePlace?: () => void
  onCreateMoment?: () => void
}

type FeedPostType = 'route' | 'place' | 'moment'
type FeedTabType = 'all' | 'routes' | 'places' | 'moments' | 'nearby'

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

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

const API_BASE_URL = RAW_API_BASE_URL
  ? RAW_API_BASE_URL.replace(/\/+$/, '')
  : (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000'
    : ''

const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const normalizeText = (value?: string): string => {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

const normalizeCityKey = (city: string): string => {
  const c = normalizeText(city)

  if (c.includes('калининг')) return 'kaliningrad'
  if (c.includes('моск')) return 'moscow'
  if (c.includes('петербург') || c.includes('санкт') || c.includes('спб')) return 'spb'
  if (c.includes('сочи')) return 'sochi'
  if (c.includes('казан')) return 'kazan'

  return c
}

const normalizeCityFolder = (city: string): string => {
  const c = normalizeText(city)

  if (c.includes('калининг')) return 'калининград'
  if (c.includes('моск')) return 'москва'
  if (c.includes('петербург') || c.includes('санкт') || c.includes('спб')) {
    return 'санкт-петербург'
  }
  if (c.includes('сочи')) return 'сочи'
  if (c.includes('казан')) return 'казань'

  return c
}

const getCityCoverUrl = (cityFolder: string): string =>
  `${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`

const getAllRoutes = (): PopularRoute[] => {
  return Object.values(POPULAR_ROUTES).flat()
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
          <stop offset="0%" stop-color="#ece5db"/>
          <stop offset="100%" stop-color="#d9d2c8"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <circle cx="980" cy="170" r="180" fill="rgba(255,255,255,0.28)"/>
      <circle cx="180" cy="640" r="220" fill="rgba(255,255,255,0.18)"/>
      <text x="80" y="620" font-size="62" font-family="Arial, sans-serif" fill="#1f2937" font-weight="700">
        ${safeTitle}
      </text>
      <text x="80" y="690" font-size="28" font-family="Arial, sans-serif" fill="rgba(31,41,55,0.72)">
        ${safeSubtitle}
      </text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
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

const routeIndex = new Map<string, PopularRoute>(
  getAllRoutes().map(route => [route.id, route])
)

const getRouteFallbackImages = (routeId?: string, city?: string): string[] => {
  const route = routeId ? routeIndex.get(routeId) : undefined
  const cityFolder = normalizeCityFolder(route?.city || city || '')

  const localImages = Array.isArray((route as any)?.images)
    ? ((route as any).images as string[])
    : []

  const coverImage = (route as any)?.coverImage
    ? [String((route as any).coverImage)]
    : []

  const merged = dedupeImages([
    ...coverImage,
    ...localImages,
    cityFolder ? getCityCoverUrl(cityFolder) : '',
  ])

  return merged
}

const getPlaceFallbackImages = (post: FeedPost): string[] => {
  const routeImages = getRouteFallbackImages(post.routeId, post.city)
  const cityFolder = normalizeCityFolder(post.city || '')
  const cityCover = cityFolder ? getCityCoverUrl(cityFolder) : ''

  return dedupeImages([
    ...routeImages,
    cityCover,
  ])
}

const normalizeFeedPost = (post: FeedPost): FeedPost => {
  const normalizedImages = dedupeImages([
    ...(Array.isArray(post.images) ? post.images : []),
    post.image || '',
  ])

  const routeFallbackImages = getRouteFallbackImages(post.routeId, post.city)
  const placeFallbackImages = post.type === 'place' ? getPlaceFallbackImages(post) : []
  const fallbackImages = post.type === 'route' ? routeFallbackImages : placeFallbackImages
  const finalImages = normalizedImages.length > 0 ? normalizedImages : fallbackImages

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
    cityFolder: post.cityFolder || normalizeCityFolder(post.city || ''),
    title: post.title || 'Без названия',
    description: post.description || '',
    image:
      finalImages[0] ||
      createPlaceholderImage(post.title || 'Без названия', fallbackSubtitle),
    images: finalImages,
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
  const url = new URL(buildApiUrl('/api/feed'), window.location.origin)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))

  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'omit',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('Feed request failed:', res.status, text)
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
  const res = await fetch(
    buildApiUrl(`/api/places/${encodeURIComponent(placeId)}/full`),
    {
      method: 'GET',
      credentials: 'omit',
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  if (!data?.ok || !data?.data) return null

  return data.data as PlaceFullData
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

  const [activeTab, setActiveTab] = useState<FeedTabType>('all')
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false)
  const [selectedCityKeys, setSelectedCityKeys] = useState<string[]>([])

  const cityMenuRef = useRef<HTMLDivElement | null>(null)

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
    const onClickOutside = (event: MouseEvent) => {
      if (!cityMenuRef.current) return
      if (!cityMenuRef.current.contains(event.target as Node)) {
        setIsCityMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

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

          if (data?.photos?.length) {
            const contextImages = dedupeImages(
              data.photos.map(photo => photo.url || photo.thumb_url || '').filter(Boolean)
            )

            if (contextImages.length > 0) {
              setFeedPosts(prev =>
                prev.map(item =>
                  item.id === openedPost.id
                    ? {
                        ...item,
                        images: dedupeImages([...contextImages, ...item.images]),
                        image: contextImages[0] || item.image,
                      }
                    : item
                )
              )
            }
          }
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

  const availableCities = useMemo(() => {
    const map = new Map<string, string>()

    for (const post of feedPosts) {
      const key = normalizeCityKey(post.city || '')
      const title = (post.city || '').trim()
      if (!key || !title) continue
      if (!map.has(key)) map.set(key, title)
    }

    return Array.from(map.entries())
      .map(([key, title]) => ({ key, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
  }, [feedPosts])

  useEffect(() => {
    if (availableCities.length === 0) return

    setSelectedCityKeys(prev => {
      if (prev.length === 0) {
        return availableCities.map(city => city.key)
      }

      const availableKeys = new Set(availableCities.map(city => city.key))
      const cleaned = prev.filter(key => availableKeys.has(key))

      if (cleaned.length === 0) {
        return availableCities.map(city => city.key)
      }

      return cleaned
    })
  }, [availableCities])

  const allCitiesSelected =
    availableCities.length > 0 &&
    availableCities.every(city => selectedCityKeys.includes(city.key))

  const toggleCity = (cityKey: string) => {
    setSelectedCityKeys(prev => {
      if (prev.includes(cityKey)) {
        if (prev.length === 1) return prev
        return prev.filter(key => key !== cityKey)
      }
      return [...prev, cityKey]
    })
  }

  const toggleAllCities = () => {
    setSelectedCityKeys(prev => {
      if (availableCities.length === 0) return prev
      if (allCitiesSelected) {
        return [availableCities[0].key]
      }
      return availableCities.map(city => city.key)
    })
  }

  const quickTabs: { key: FeedTabType; label: string }[] = [
    { key: 'all', label: 'Для тебя' },
    { key: 'routes', label: 'Маршруты' },
    { key: 'places', label: 'Места' },
    { key: 'moments', label: 'Моменты' },
    { key: 'nearby', label: 'Рядом' },
  ]

  const visibleFeedPosts = useMemo(() => {
    let items = [...feedPosts]

    if (activeTab === 'routes') {
      items = items.filter(item => item.type === 'route')
    } else if (activeTab === 'places') {
      items = items.filter(item => item.type === 'place')
    } else if (activeTab === 'moments') {
      items = items.filter(item => item.type === 'moment')
    } else if (activeTab === 'nearby') {
      items = items.filter(item => normalizeCityKey(item.city) === 'kaliningrad')
    }

    if (selectedCityKeys.length > 0) {
      const selectedSet = new Set(selectedCityKeys)
      items = items.filter(item => selectedSet.has(normalizeCityKey(item.city)))
    }

    return items
  }, [feedPosts, activeTab, selectedCityKeys])

  const composerActions = [
    {
      key: 'route',
      label: 'Добавить маршрут',
      onClick: onCreateRoute,
      visible: Boolean(onCreateRoute),
    },
    {
      key: 'place',
      label: 'Поделиться местом',
      onClick: onCreatePlace,
      visible: Boolean(onCreatePlace),
    },
    {
      key: 'moment',
      label: 'Момент',
      onClick: onCreateMoment,
      visible: Boolean(onCreateMoment),
    },
  ].filter(item => item.visible)

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

    const apiAndContextImages = dedupeImages([
      ...contextImages,
      ...(post.images?.length ? post.images : post.image ? [post.image] : []),
    ])

    if (apiAndContextImages.length > 0) {
      const visible = apiAndContextImages.filter(img => !failedImages[`${post.id}_${img}`])
      if (visible.length > 0) return visible
    }

    const fallbackImages =
      post.type === 'route'
        ? getRouteFallbackImages(post.routeId, post.city)
        : getPlaceFallbackImages(post)

    const visibleFallback = fallbackImages.filter(img => !failedImages[`${post.id}_${img}`])
    if (visibleFallback.length > 0) return visibleFallback

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

  const renderMediaGrid = (post: FeedPost) => {
    const visibleImages = getVisibleImages(post).slice(0, 4)
    const count = visibleImages.length

    if (count <= 0) return null

    const openPost = () => setOpenedPost(post)

    if (count === 1) {
      return (
        <button type="button" className="feed-media-grid single" onClick={openPost}>
          <img
            src={visibleImages[0]}
            alt={post.title}
            className="feed-media-grid-image"
            onError={() => {
              setFailedImages(prev => ({
                ...prev,
                [`${post.id}_${visibleImages[0]}`]: true,
              }))
            }}
          />
          <div className="feed-card-badges">
            <span className="feed-card-badge primary">{getPostTypeLabel(post.type)}</span>
            <span className="feed-card-badge">{post.city}</span>
          </div>
        </button>
      )
    }

    return (
      <div className={`feed-media-grid count-${count}`}>
        {visibleImages.map((img, idx) => (
          <button
            key={`${post.id}_${img}_${idx}`}
            type="button"
            className="feed-media-grid-item"
            onClick={openPost}
          >
            <img
              src={img}
              alt={`${post.title} ${idx + 1}`}
              className="feed-media-grid-image"
              onError={() => {
                setFailedImages(prev => ({
                  ...prev,
                  [`${post.id}_${img}`]: true,
                }))
              }}
            />
            {idx === 0 && (
              <div className="feed-card-badges">
                <span className="feed-card-badge primary">{getPostTypeLabel(post.type)}</span>
                <span className="feed-card-badge">{post.city}</span>
              </div>
            )}
            {idx === 3 && getVisibleImages(post).length > 4 && (
              <div className="feed-media-grid-more">
                +{getVisibleImages(post).length - 4}
              </div>
            )}
          </button>
        ))}
      </div>
    )
  }

  const renderImageSlider = (post: FeedPost, variant: 'card' | 'modal' = 'card') => {
    if (variant === 'card') {
      return renderMediaGrid(post)
    }

    const visibleImages = getVisibleImages(post)
    const currentImageIndex = getPostImageIndex(post.id, visibleImages.length)
    const currentImage = visibleImages[currentImageIndex] || ''

    return (
      <div className="feed-post-image-wrap">
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
          className="feed-post-image"
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

        <div className="feed-card-content">
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
        </div>

        {renderImageSlider(post, 'card')}

        <div className="feed-card-actions-top">
          <div className="feed-card-actions-left">
            <button
              type="button"
              className={`feed-icon-btn ${isLiked ? 'active' : ''}`}
              onClick={() => toggleLike(post.id)}
            >
              ♡
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

        <div className="feed-card-content feed-card-content-bottom">
          <div className="feed-card-stats-line">
            <strong>{post.likes + (isLiked ? 1 : 0)}</strong> нравится
            {typeof post.commentsCount === 'number' && post.commentsCount > 0 && (
              <span className="feed-muted-inline"> · {post.commentsCount} комментариев</span>
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
                Нравится · {openedPost.likes + (isLiked ? 1 : 0)}
              </button>

              <button
                type="button"
                className={`feed-action-btn ${isSaved ? 'active' : ''}`}
                onClick={() => toggleSave(openedPost.id)}
              >
                Сохранить
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
      <div className="feed-topbar-sticky">
        <div className="feed-topbar">
          <div className="feed-topbar-main">
            <div className="feed-title-wrap">
              <h1 className="feed-page-title">Лента</h1>
              <div className="feed-subtitle">
                Маршруты, места и впечатления путешественников
              </div>
            </div>
          </div>

          <div className="feed-topbar-row">
            <div className="feed-quick-tabs" role="tablist" aria-label="Типы публикаций">
              {quickTabs.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className={`feed-quick-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="feed-city-filter" ref={cityMenuRef}>
              <button
                type="button"
                className={`feed-filter-toggle ${isCityMenuOpen ? 'open' : ''}`}
                onClick={() => setIsCityMenuOpen(prev => !prev)}
                aria-label="Фильтр городов"
              >
                ☰
              </button>

              {isCityMenuOpen && (
                <div className="feed-city-menu">
                  <div className="feed-city-menu-head">
                    <div className="feed-city-menu-title">Города в ленте</div>
                    <button
                      type="button"
                      className="feed-city-menu-action"
                      onClick={toggleAllCities}
                    >
                      {allCitiesSelected ? 'Оставить один' : 'Выбрать все'}
                    </button>
                  </div>

                  <div className="feed-city-menu-list">
                    {availableCities.map(city => {
                      const checked = selectedCityKeys.includes(city.key)

                      return (
                        <label key={city.key} className="feed-city-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCity(city.key)}
                          />
                          <span>{city.title}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="feed-shell">
        <section className="feed-composer">
          <div className="feed-composer-avatar">✈️</div>

          <div className="feed-composer-main">
            <div className="feed-composer-input-row">
              <div className="feed-composer-placeholder">Поделитесь поездкой или интересным местом</div>
            </div>

            <div className="feed-composer-actions">
              {composerActions.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className="feed-composer-action"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLoadingFeed && (
          <div className="feed-state-message">Загружаем ленту…</div>
        )}

        {!isLoadingFeed && feedError && (
          <div className="feed-state-message error">{feedError}</div>
        )}

        {!isLoadingFeed && !feedError && visibleFeedPosts.length === 0 && (
          <div className="feed-state-message">В ленте пока нет публикаций по выбранным городам</div>
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