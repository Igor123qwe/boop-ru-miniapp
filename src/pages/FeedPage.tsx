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
  sourceRouteTitle?: string
  pointTitle?: string
  pointTime?: string
  pointIndex?: number
  dayTitle?: string
}

type RoutePoint = PopularRoute['days'][number]['points'][number]

const FEED_LIKES_KEY = 'progid_feed_likes_map'
const FEED_IMAGE_CACHE_KEY = 'progid_feed_image_cache_v2'
const POINT_IMAGE_CACHE_KEY = 'progid_feed_point_image_cache_v1'
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

const feedTypeLabel = (type: FeedPostType): string => {
  if (type === 'place') return 'Место'
  if (type === 'moment') return 'Момент'
  return 'Маршрут'
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

const uniqueStrings = (items: string[]): string[] => {
  return Array.from(new Set(items.map(v => v?.trim()).filter(Boolean) as string[]))
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

const collectRouteImages = (
  route: PopularRoute,
  cityFolder: string,
  imageCache: Record<string, string>
): string[] => {
  const result: string[] = []

  const cached = imageCache[route.id]
  if (cached) result.push(cached)

  const coverImage = (route as any).coverImage as string | undefined
  const routeImages = (route as any).images as string[] | undefined

  if (coverImage) result.push(coverImage)
  if (Array.isArray(routeImages)) result.push(...routeImages)

  for (const day of route.days) {
    for (const point of day.points) {
      if (Array.isArray(point.images)) {
        result.push(...point.images)
      }
    }
  }

  if (result.length === 0) {
    result.push(getCityCoverUrl(cityFolder))
  }

  return uniqueStrings(result)
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

const readPointImageCache = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(POINT_IMAGE_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writePointImageCache = (map: Record<string, string[]>) => {
  localStorage.setItem(POINT_IMAGE_CACHE_KEY, JSON.stringify(map))
}

const getPointCacheKey = (routeId: string, pointIndex: number): string =>
  `${routeId}__${pointIndex}`

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

const resolvePointImages = async (
  route: PopularRoute,
  cityFolder: string,
  pointTitle: string,
  pointIndex: number
): Promise<string[]> => {
  try {
    const cloudPhotos = await loadCloudPointImages(cityFolder, route.id, pointIndex)
    if (cloudPhotos.length > 0) return cloudPhotos
  } catch {
    // ignore
  }

  try {
    const params = new URLSearchParams({
      routeId: route.id,
      pointIndex: String(pointIndex),
      city: route.city,
      title: pointTitle,
    })

    const resp = await fetch(`${API_BASE}/api/photos?${params.toString()}`)
    if (!resp.ok) return []

    const data = await resp.json()
    const photos = extractPhotosFromApi(data)
    if (photos.length > 0) return photos
  } catch {
    // ignore
  }

  return []
}

const buildPlaceDescription = (
  point: RoutePoint,
  route: PopularRoute,
  dayTitle: string
): string => {
  if (point.description?.trim()) return point.description.trim()
  return `${point.title} · ${dayTitle} · из маршрута «${route.title}»`
}

const buildMomentDescription = (
  point: RoutePoint,
  route: PopularRoute,
  dayTitle: string
): string => {
  const pieces = [
    point.time?.trim(),
    dayTitle.trim(),
    route.city.trim(),
    point.description?.trim(),
  ].filter(Boolean)

  if (pieces.length > 0) return pieces.join(' · ')
  return `Момент из маршрута «${route.title}»`
}

export const FeedPage: React.FC<Props> = ({
  onOpenRoutes,
  onCreateRoute,
  onCreatePlace,
  onCreateMoment,
}) => {
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [likesMap, setLikesMap] = useState<Record<string, number>>({})
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [pointImageCache, setPointImageCache] = useState<Record<string, string[]>>({})
  const [activePost, setActivePost] = useState<FeedPost | null>(null)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({})
  const [saveToast, setSaveToast] = useState('')
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({})

  useEffect(() => {
    setLikedIds(readLikedPostIds())
    setSavedIds(readSavedPostIds())
    setLikesMap(readLikesMap())
    setImageCache(readImageCache())
    setPointImageCache(readPointImageCache())
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
    const mixedPosts: FeedPost[] = []

    allRoutes.forEach((route, routeIndex) => {
      const cityFolder = normalizeCityFolder(route.city)
      const routeImages = collectRouteImages(route, cityFolder, imageCache)
      const routePostId = `route_post_${route.id}`
      const pointsCount = countRoutePoints(route)
      const previewPoints = buildRoutePreview(route)
      const baseLikes = typeof route.popularity === 'number' ? route.popularity : 0
      const routeLikes =
        likesMap[routePostId] ?? Math.max(6, Math.round(baseLikes / 8) || routeIndex + 7)

      mixedPosts.push({
        id: routePostId,
        type: 'route',
        routeId: route.id,
        city: route.city,
        cityFolder,
        title: route.title,
        description: buildRouteDescription(route),
        image: routeImages[0],
        images: routeImages,
        likes: routeLikes,
        daysCount: route.daysCount,
        pointsCount,
        difficulty: route.difficulty,
        distanceKm: route.distanceKm,
        previewPoints,
        route,
        createdAt: new Date(Date.now() - routeIndex * 1000 * 60 * 60 * 5).toISOString(),
      })

      let meaningfulIndex = 0
      let globalPointIndex = 0

      route.days.forEach((day, dayIndex) => {
        day.points.forEach((point, pointIndex) => {
          const currentPointIndex = globalPointIndex
          globalPointIndex += 1

          const title = point.title?.trim() || ''
          if (!title || isUtilityPoint(title)) return

          const pointCacheKey = getPointCacheKey(route.id, currentPointIndex)
          const cachedPointImages = pointImageCache[pointCacheKey] ?? []

          const pointImages = uniqueStrings([
            ...cachedPointImages,
            ...(Array.isArray(point.images) ? point.images : []),
            ...routeImages,
          ])

          const placeId = `place_post_${route.id}_${dayIndex}_${pointIndex}`
          const placeLikes =
            likesMap[placeId] ??
            Math.max(3, Math.round(baseLikes / 12) + meaningfulIndex + 2)

          mixedPosts.push({
            id: placeId,
            type: 'place',
            routeId: route.id,
            city: route.city,
            cityFolder,
            title,
            description: buildPlaceDescription(point, route, day.title),
            image: pointImages[0] || routeImages[0],
            images: pointImages.length > 0 ? pointImages : routeImages,
            likes: placeLikes,
            pointsCount: 1,
            previewPoints: [route.title, day.title],
            route,
            pointTitle: title,
            pointTime: point.time,
            pointIndex: currentPointIndex,
            dayTitle: day.title,
            sourceRouteTitle: route.title,
            createdAt: new Date(
              Date.now() - (routeIndex * 10 + meaningfulIndex + 1) * 1000 * 60 * 60 * 2
            ).toISOString(),
          })

          const momentImages = uniqueStrings([
            ...cachedPointImages,
            ...(Array.isArray(point.images) ? point.images : []),
            ...routeImages,
          ])

          const momentId = `moment_post_${route.id}_${dayIndex}_${pointIndex}`
          const momentLikes =
            likesMap[momentId] ??
            Math.max(2, Math.round(baseLikes / 14) + meaningfulIndex + 1)

          mixedPosts.push({
            id: momentId,
            type: 'moment',
            routeId: route.id,
            city: route.city,
            cityFolder,
            title: point.time ? `${point.time} · ${title}` : title,
            description: buildMomentDescription(point, route, day.title),
            image: momentImages[0] || routeImages[0],
            images: momentImages.length > 0 ? momentImages : routeImages,
            likes: momentLikes,
            previewPoints: [route.title, day.title],
            route,
            pointTitle: title,
            pointTime: point.time,
            pointIndex: currentPointIndex,
            dayTitle: day.title,
            sourceRouteTitle: route.title,
            createdAt: new Date(
              Date.now() - (routeIndex * 10 + meaningfulIndex + 1) * 1000 * 60 * 45
            ).toISOString(),
          })

          meaningfulIndex += 1
        })
      })
    })

    return mixedPosts.sort((a, b) => {
      const aScore = (a.route.popularity ?? 0) + a.likes
      const bScore = (b.route.popularity ?? 0) + b.likes
      return bScore - aScore
    })
  }, [likesMap, imageCache, pointImageCache])

  const visiblePosts = useMemo(() => {
    return posts.filter(post => {
      const hasGoodImage = post.images.some(img => !failedImages[img])
      return hasGoodImage
    })
  }, [posts, failedImages])

  const getSafeImages = (post: FeedPost): string[] => {
    const safe = post.images.filter(Boolean).filter(img => !failedImages[img])
    if (safe.length > 0) return safe

    if (post.image && !failedImages[post.image]) return [post.image]

    return [getCityCoverUrl(post.cityFolder)]
  }

  const getDisplayedPostImage = (post: FeedPost): string => {
    const safeImages = getSafeImages(post)
    const index = imageIndexes[post.id] ?? 0
    return safeImages[index % safeImages.length]
  }

  const mergePostImages = (post: FeedPost, extraImages: string[]): FeedPost => {
    const merged = uniqueStrings([...extraImages, ...post.images])
    return {
      ...post,
      images: merged,
      image: merged[0] || post.image,
    }
  }

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
    const currentImage = getDisplayedPostImage(post)
    saveRouteToMyTrips(post.route, currentImage)
    toggleSave(post.id)
    setSaveToast('Маршрут сохранён в «Мои поездки»')
  }

  const hydratePostImages = async (post: FeedPost) => {
    if (loadingImages[post.id]) return

    setLoadingImages(prev => ({ ...prev, [post.id]: true }))

    try {
      if ((post.type === 'place' || post.type === 'moment') && typeof post.pointIndex === 'number') {
        const pointCacheKey = getPointCacheKey(post.routeId, post.pointIndex)
        const cachedPointImages = pointImageCache[pointCacheKey] ?? []

        if (cachedPointImages.length > 0) {
          setActivePost(prev => {
            if (!prev || prev.id !== post.id) return prev
            return mergePostImages(prev, cachedPointImages)
          })
          return
        }

        const resolvedPointImages = await resolvePointImages(
          post.route,
          post.cityFolder,
          post.pointTitle || post.title,
          post.pointIndex
        )

        if (resolvedPointImages.length > 0) {
          const nextPointCache = {
            ...pointImageCache,
            [pointCacheKey]: resolvedPointImages,
          }

          setPointImageCache(nextPointCache)
          writePointImageCache(nextPointCache)

          setActivePost(prev => {
            if (!prev || prev.id !== post.id) return prev
            return mergePostImages(prev, resolvedPointImages)
          })
          return
        }
      }

      if (post.type === 'route') {
        const routeHasOwnImage = hasOwnCoverImage(post.route)
        const currentCached = imageCache[post.routeId]
        const currentImage = currentCached || post.image
        const currentIsCityCover = currentImage === getCityCoverUrl(post.cityFolder)

        if (routeHasOwnImage && !currentIsCityCover) return
        if (currentCached && !currentIsCityCover) return

        const resolved = await resolveRouteImage(post.route, post.cityFolder)
        if (!resolved) return

        const next = {
          ...imageCache,
          [post.routeId]: resolved,
        }

        setImageCache(next)
        writeImageCache(next)

        setActivePost(prev => {
          if (!prev || prev.id !== post.id) return prev
          return mergePostImages(prev, [resolved])
        })
      }
    } finally {
      setLoadingImages(prev => ({ ...prev, [post.id]: false }))
    }
  }

  // Фоновая гидрация картинок для place/moment, чтобы стрелки и фото были сразу в ленте.
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const candidates = visiblePosts
        .filter(
          post =>
            (post.type === 'place' || post.type === 'moment') &&
            typeof post.pointIndex === 'number'
        )
        .slice(0, 18)

      for (const post of candidates) {
        if (cancelled) return
        if (typeof post.pointIndex !== 'number') continue

        const pointCacheKey = getPointCacheKey(post.routeId, post.pointIndex)
        const cached = pointImageCache[pointCacheKey] ?? []
        const pointOwnImages = post.images.filter(img => !img.includes('/city-cover.jpg'))

        if (cached.length > 0 || pointOwnImages.length > 1) continue

        try {
          const resolved = await resolvePointImages(
            post.route,
            post.cityFolder,
            post.pointTitle || post.title,
            post.pointIndex
          )

          if (cancelled || resolved.length === 0) continue

          const next = {
            ...pointImageCache,
            [pointCacheKey]: resolved,
          }

          setPointImageCache(next)
          writePointImageCache(next)
        } catch {
          // ignore
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [visiblePosts, pointImageCache])

  const showPrevImage = (e: React.MouseEvent, post: FeedPost) => {
    e.stopPropagation()
    const safeImages = getSafeImages(post)
    if (safeImages.length <= 1) return

    setImageIndexes(prev => {
      const current = prev[post.id] ?? 0
      return {
        ...prev,
        [post.id]: (current - 1 + safeImages.length) % safeImages.length,
      }
    })
  }

  const showNextImage = (e: React.MouseEvent, post: FeedPost) => {
    e.stopPropagation()
    const safeImages = getSafeImages(post)
    if (safeImages.length <= 1) return

    setImageIndexes(prev => {
      const current = prev[post.id] ?? 0
      return {
        ...prev,
        [post.id]: (current + 1) % safeImages.length,
      }
    })
  }

  const handleOpenPost = async (post: FeedPost) => {
    setIsAddMenuOpen(false)
    const withCurrentImage = {
      ...post,
      image: getDisplayedPostImage(post),
    }
    setActivePost(withCurrentImage)
    await hydratePostImages(withCurrentImage)
  }

  return (
    <div className="feed-page">
      {saveToast && <div className="feed-toast">{saveToast}</div>}

      <div className="feed-compose-card">
        <div className="feed-compose-left">
          <div className="feed-compose-avatar">🧭</div>

          <div className="feed-compose-menu-wrap">
            <button
              type="button"
              className="feed-compose-main-btn"
              onClick={() => setIsAddMenuOpen(prev => !prev)}
            >
              + Добавить
            </button>

            {isAddMenuOpen && (
              <div className="feed-add-menu">
                <button
                  type="button"
                  className="feed-add-menu-item"
                  onClick={() => {
                    setIsAddMenuOpen(false)
                    onCreateRoute?.()
                  }}
                >
                  <div className="feed-add-menu-title">Маршрут</div>
                  <div className="feed-add-menu-subtitle">
                    Полноценный маршрут по дням и точкам
                  </div>
                </button>

                <button
                  type="button"
                  className="feed-add-menu-item"
                  onClick={() => {
                    setIsAddMenuOpen(false)
                    onCreatePlace?.()
                  }}
                >
                  <div className="feed-add-menu-title">Достопримечательность</div>
                  <div className="feed-add-menu-subtitle">
                    Одно место с фото, описанием и адресом
                  </div>
                </button>

                <button
                  type="button"
                  className="feed-add-menu-item"
                  onClick={() => {
                    setIsAddMenuOpen(false)
                    onCreateMoment?.()
                  }}
                >
                  <div className="feed-add-menu-title">Момент</div>
                  <div className="feed-add-menu-subtitle">
                    Фото, координаты или адрес, короткое описание как пост
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="feed-compose-actions">
          <button
            type="button"
            className="feed-compose-icon-btn"
            title="Добавить"
            onClick={() => setIsAddMenuOpen(prev => !prev)}
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
          Маршруты, достопримечательности и моменты в формате social travel feed
        </div>
      </div>

      <div className="feed-list">
        {visiblePosts.map(post => {
          const isLiked = likedIds.includes(post.id)
          const isSaved = savedIds.includes(post.id)
          const isImageLoading = loadingImages[post.id]
          const safeImages = getSafeImages(post)
          const currentImage = getDisplayedPostImage(post)
          const currentIndex = imageIndexes[post.id] ?? 0

          return (
            <button
              key={post.id}
              type="button"
              className="feed-card"
              onClick={() => handleOpenPost(post)}
            >
              <div className="feed-image-wrap">
                <img
                  src={currentImage}
                  alt={post.title}
                  className="feed-image"
                  onError={() => {
                    setFailedImages(prev => ({ ...prev, [currentImage]: true }))
                  }}
                />

                <div className="feed-image-overlay">
                  <span className="feed-image-chip">{feedTypeLabel(post.type)}</span>
                  <span className="feed-image-chip">{post.city}</span>
                </div>

                {safeImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="feed-carousel-btn left"
                      onClick={e => showPrevImage(e, post)}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="feed-carousel-btn right"
                      onClick={e => showNextImage(e, post)}
                    >
                      ›
                    </button>

                    <div className="feed-carousel-counter">
                      {currentIndex + 1} / {safeImages.length}
                    </div>
                  </>
                )}

                {isImageLoading && (
                  <div className="feed-image-loader">Подбираем фото…</div>
                )}
              </div>

              <div className="feed-content">
                <div className="feed-title">{post.title}</div>
                <div className="feed-description">{post.description}</div>

                <div className="feed-meta-line">
                  {post.type === 'route' && typeof post.daysCount !== 'undefined' && (
                    <>
                      <span>
                        {post.daysCount} {declension('день', 'дня', 'дней', post.daysCount)}
                      </span>
                      <span>•</span>
                    </>
                  )}

                  {post.type === 'route' && typeof post.pointsCount !== 'undefined' && (
                    <>
                      <span>{post.pointsCount} точек</span>
                      <span>•</span>
                    </>
                  )}

                  {post.type === 'route' && (
                    <>
                      <span>{routeDifficultyLabel(post.difficulty)}</span>
                      {typeof post.distanceKm !== 'undefined' && (
                        <>
                          <span>•</span>
                          <span>~{post.distanceKm} км</span>
                        </>
                      )}
                    </>
                  )}

                  {post.type !== 'route' && post.sourceRouteTitle && (
                    <span>Из маршрута: {post.sourceRouteTitle}</span>
                  )}

                  {post.type === 'moment' && post.pointTime && (
                    <>
                      <span>•</span>
                      <span>{post.pointTime}</span>
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

      {activePost && (() => {
        const modalSafeImages = getSafeImages(activePost)
        const modalIndex = imageIndexes[activePost.id] ?? 0
        const modalImage = modalSafeImages[modalIndex % modalSafeImages.length]
        const modalLoading = loadingImages[activePost.id]

        return (
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
                <img
                  src={modalImage}
                  alt={activePost.title}
                  className="feed-post-image"
                  onError={() => {
                    setFailedImages(prev => ({ ...prev, [modalImage]: true }))
                  }}
                />

                {modalSafeImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="feed-carousel-btn left"
                      onClick={e => showPrevImage(e, activePost)}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="feed-carousel-btn right"
                      onClick={e => showNextImage(e, activePost)}
                    >
                      ›
                    </button>

                    <div className="feed-carousel-counter">
                      {modalIndex + 1} / {modalSafeImages.length}
                    </div>
                  </>
                )}

                {modalLoading && (
                  <div className="feed-post-image-loader">
                    Ищем более подходящее фото…
                  </div>
                )}
              </div>

              <div className="feed-post-body">
                <div className="feed-post-topline">
                  <span className="feed-type">{feedTypeLabel(activePost.type)}</span>
                  <span className="feed-city-tag">{activePost.city}</span>
                </div>

                <div className="feed-post-title">{activePost.title}</div>
                <div className="feed-post-description">{activePost.description}</div>

                <div className="feed-post-stats">
                  {activePost.type === 'route' ? (
                    <>
                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">{activePost.daysCount ?? '—'}</div>
                        <div className="feed-post-stat-label">дней</div>
                      </div>

                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">{activePost.pointsCount ?? '—'}</div>
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
                    </>
                  ) : (
                    <>
                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">{feedTypeLabel(activePost.type)}</div>
                        <div className="feed-post-stat-label">тип поста</div>
                      </div>

                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">{activePost.city}</div>
                        <div className="feed-post-stat-label">город</div>
                      </div>

                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">{activePost.pointTime || '—'}</div>
                        <div className="feed-post-stat-label">время</div>
                      </div>

                      <div className="feed-post-stat">
                        <div className="feed-post-stat-value">
                          {activePost.sourceRouteTitle || '—'}
                        </div>
                        <div className="feed-post-stat-label">источник</div>
                      </div>
                    </>
                  )}
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
        )
      })()}
    </div>
  )
}