import React, { useEffect, useMemo, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import './PopularRoutesPage.css'

type Props = {
  city: string
  onBack: () => void
}

// Нормализуем строку города к нашим ключам popularRoutes
const normalizeCityKey = (city: string): string => {
  const c = city.toLowerCase().trim()

  if (c.includes('калининг')) return 'kaliningrad'
  if (c.includes('moscow') || c.includes('моск')) return 'moscow'
  if (
    c.includes('петербург') ||
    c.includes('санкт') ||
    c.includes('spb') ||
    c.includes('спб')
  ) {
    return 'spb'
  }
  if (c.includes('сочи')) return 'sochi'
  if (c.includes('казан')) return 'kazan'

  return city
}

// Нормализуем строку города к имени папки в бакете
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

// все маршруты, если город не распознан
const getAllRoutes = (): PopularRoute[] => {
  const arrays = Object.values(POPULAR_ROUTES)
  return arrays.flat()
}

// склонение "день"
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

type SortMode = 'popularity' | 'days' | 'difficulty'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'
type ViewMode = 'places' | 'ai' | 'routes'

type ActivePointState = {
  routeId: string
  dayTitle: string
  point: {
    title: string
    time?: string
    description?: string
    images?: string[]
  }
}

type WikiState = {
  loading: boolean
  error: boolean
  extract: string | null
  url: string | null
}

// ===== Википедия для описаний =====
const fetchWikiExtract = async (
  rawTitle: string
): Promise<{ extract: string; url: string } | null> => {
  try {
    const searchUrl = `https://ru.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      rawTitle
    )}&limit=1&namespace=0&format=json&origin=*`

    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null

    const searchData = (await searchRes.json()) as [
      string,
      string[],
      string[],
      string[]
    ]

    const foundTitle = searchData[1]?.[0]
    if (!foundTitle) return null

    const summaryUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      foundTitle
    )}?origin=*`

    const summaryRes = await fetch(summaryUrl)
    if (!summaryRes.ok) return null

    const summaryData = await summaryRes.json()

    const extract: string | undefined =
      summaryData.extract ||
      summaryData.description ||
      summaryData?.content_urls?.desktop?.page

    if (!extract) return null

    const url: string | undefined =
      summaryData?.content_urls?.desktop?.page ||
      `https://ru.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`

    return {
      extract,
      url: url ?? `https://ru.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`
    }
  } catch {
    return null
  }
}

// базовый URL бекенда
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://progid-backend.vercel.app'

// базовый URL облака
const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images'

const getCityCoverUrl = (cityFolder: string): string =>
  `${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`

const MAX_CLOUD_POINT_IMAGES = 8

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
  pointIndex: number
): Promise<string[]> => {
  const goodUrls: string[] = []

  for (let i = 1; i <= MAX_CLOUD_POINT_IMAGES; i++) {
    const url = `${CLOUD_BASE_URL}/${cityFolder}/${routeId}/point_${pointIndex}/image-${i}.jpg`
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeImageUrl(url)
    if (ok) {
      goodUrls.push(url)
    }
  }

  return goodUrls
}

const extractPhotosFromApi = (data: any): string[] => {
  if (!data || typeof data !== 'object') return []

  const candidates: unknown[] = [
    data.photos,
    data.publicUrls,
    data.urls,
    data.images
  ]

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

type PlaceItem = {
  id: string
  route: PopularRoute
  dayTitle: string
  pointIndex: number
  point: {
    title: string
    time?: string
    description?: string
    images?: string[]
  }
}

// подготовить embed-URL Яндекса
const prepareYandexEmbed = (raw: string): string => {
  let urlStr = raw.startsWith('https://yandex.ru/maps/')
    ? raw.replace('https://yandex.ru/maps/', 'https://yandex.ru/map-widget/v1/')
    : raw

  try {
    const url = new URL(urlStr)
    const rtext = url.searchParams.get('rtext')
    const alreadyHasPt = url.searchParams.has('pt')

    if (rtext && !alreadyHasPt) {
      const pts = rtext
        .split('~')
        .map(s => s.trim())
        .filter(Boolean)

      if (pts.length > 0) {
        const ptParam = pts.map(p => `${p},pm2rdm`).join('~')
        url.searchParams.set('pt', ptParam)
      }
    }

    return url.toString()
  } catch {
    return urlStr
  }
}

const getEmbedUrl = (route: PopularRoute): string | undefined => {
  const embed = (route as any).yandexMapEmbedUrl as string | undefined
  const plain = (route as any).yandexMapUrl as string | undefined

  if (embed) return prepareYandexEmbed(embed)
  if (plain) return prepareYandexEmbed(plain)

  return undefined
}

type RoutePoint = PopularRoute['days'][number]['points'][number]

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
    /^рынок$/
  ]

  return utilityPatterns.some(re => re.test(t))
}

const routeDifficultyLabel = (difficulty?: string): string => {
  if (difficulty === 'medium') return 'Средний'
  if (difficulty === 'hard') return 'Сложный'
  return 'Лёгкий'
}

const routeDifficultyClass = (difficulty?: string): string => {
  if (difficulty === 'medium') return 'is-medium'
  if (difficulty === 'hard') return 'is-hard'
  return 'is-easy'
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
      if (!points.includes(title)) {
        points.push(title)
      }
      if (points.length >= 3) return points
    }
  }
  return points
}

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const { webApp } = useTelegramWebApp()

  const cityKey = normalizeCityKey(city)

  let routes = POPULAR_ROUTES[cityKey] ?? POPULAR_ROUTES[city]
  if (!routes || routes.length === 0) {
    routes = getAllRoutes()
  }

  const cityTitle = routes[0]?.city ?? city
  const cityFolder = normalizeCityFolder(cityTitle)
  const cityCoverUrl = getCityCoverUrl(cityFolder)

  const [activeRoute, setActiveRoute] = useState<PopularRoute | null>(null)

  const [sortMode, setSortMode] = useState<SortMode>('popularity')
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>('all')

  const maxDaysAvailable =
    routes.length > 0 ? Math.max(...routes.map(r => r.daysCount)) : 1

  const [maxDaysFilter, setMaxDaysFilter] = useState<number>(maxDaysAvailable)
  const [mainImageIndex, setMainImageIndex] = useState<number>(0)
  const [routeImages, setRouteImages] = useState<string[]>([])

  const [activePoint, setActivePoint] = useState<ActivePointState | null>(null)
  const [pointImages, setPointImages] = useState<string[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [isPointImagesLoading, setIsPointImagesLoading] = useState<boolean>(false)

  const [wikiInfo, setWikiInfo] = useState<WikiState>({
    loading: false,
    error: false,
    extract: null,
    url: null
  })
  const [isWikiVisible, setIsWikiVisible] = useState<boolean>(false)

  const [pointPhotosCache, setPointPhotosCache] = useState<
    Record<string, string[]>
  >({})

  const [viewMode, setViewMode] = useState<ViewMode>('routes')
  const [hiddenPoints, setHiddenPoints] = useState<Record<number, number[]>>({})
  const [extraPoints, setExtraPoints] = useState<Record<number, RoutePoint[]>>(
    {}
  )
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false)
  const [placesQuery, setPlacesQuery] = useState('')
  const [showOnlyMeaningfulPlaces, setShowOnlyMeaningfulPlaces] = useState(true)

  useEffect(() => {
    if (!activeRoute) {
      setMainImageIndex(0)
      setRouteImages([])
      setActivePoint(null)
      setPointImages([])
      setActiveImageIndex(0)
      setIsPointImagesLoading(false)
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null
      })
      setIsWikiVisible(false)
      setHiddenPoints({})
      setExtraPoints({})
      setIsAddPlaceOpen(false)
    }
  }, [activeRoute])

  useEffect(() => {
    setMaxDaysFilter(maxDaysAvailable)
  }, [maxDaysAvailable])

  useEffect(() => {
    if (!webApp) return
    webApp.expand()
  }, [webApp])

  const visibleRoutes = useMemo(() => {
    let result = [...routes]
    result = result.filter(r => r.daysCount <= maxDaysFilter)

    if (difficultyFilter !== 'all') {
      result = result.filter(r => (r.difficulty ?? 'easy') === difficultyFilter)
    }

    result.sort((a, b) => {
      if (sortMode === 'days') {
        return a.daysCount - b.daysCount
      }
      if (sortMode === 'difficulty') {
        const order: DifficultyFilter[] = ['easy', 'medium', 'hard']
        const da = order.indexOf((a.difficulty ?? 'easy') as DifficultyFilter)
        const db = order.indexOf((b.difficulty ?? 'easy') as DifficultyFilter)
        return da - db
      }

      const pa = a.popularity ?? 0
      const pb = b.popularity ?? 0
      return pb - pa
    })

    return result
  }, [routes, sortMode, difficultyFilter, maxDaysFilter])

  const allPlaces = useMemo<PlaceItem[]>(() => {
    const list: PlaceItem[] = []
    const usedTitles = new Set<string>()

    for (const route of routes) {
      route.days.forEach((day, dayIdx) => {
        day.points.forEach((point, pointIdx) => {
          const normalizedTitle = (point.title || '').toLowerCase().trim()
          if (!normalizedTitle) return
          if (usedTitles.has(normalizedTitle)) return
          usedTitles.add(normalizedTitle)

          list.push({
            id: `${route.id}_${dayIdx}_${pointIdx}`,
            route,
            dayTitle: day.title,
            pointIndex: pointIdx,
            point
          })
        })
      })
    }

    return list
  }, [routes])

  const visiblePlaces = useMemo<PlaceItem[]>(() => {
    const q = placesQuery.toLowerCase().trim()

    return allPlaces.filter(place => {
      const title = place.point.title || ''
      const description = place.point.description || ''

      if (showOnlyMeaningfulPlaces && isUtilityPoint(title)) {
        return false
      }

      if (!q) return true

      return (
        title.toLowerCase().includes(q) ||
        description.toLowerCase().includes(q) ||
        place.route.title.toLowerCase().includes(q) ||
        place.dayTitle.toLowerCase().includes(q)
      )
    })
  }, [allPlaces, placesQuery, showOnlyMeaningfulPlaces])

  const totalPlacesCount = visiblePlaces.length
  const totalRoutesCount = routes.length
  const totalUniquePoints = useMemo(() => {
    const set = new Set<string>()
    routes.forEach(route => {
      route.days.forEach(day => {
        day.points.forEach(point => {
          if (point.title?.trim()) set.add(point.title.trim().toLowerCase())
        })
      })
    })
    return set.size
  }, [routes])

  const openPointModal = async (
    route: PopularRoute,
    dayTitle: string,
    point: {
      title: string
      time?: string
      description?: string
      images?: string[]
    },
    index: number
  ) => {
    const isExtra = index < 0
    const cacheKey = isExtra
      ? `extra_${route.id}_${Math.abs(index)}`
      : `${route.id}_${index}`

    setActiveRoute(route)
    setActivePoint({
      routeId: route.id,
      dayTitle,
      point
    })
    setActiveImageIndex(0)
    setIsPointImagesLoading(true)

    const baseImages = Array.isArray(point.images) ? point.images : []
    const cached = pointPhotosCache[cacheKey] ?? []

    const buildImages = (extra: string[] = []) => {
      const all = [...baseImages, ...extra]
      return Array.from(new Set(all.filter(Boolean)))
    }

    if (cached.length > 0) {
      setPointImages(buildImages(cached))
      setIsPointImagesLoading(false)
    } else {
      setPointImages(buildImages())
      if (baseImages.length > 0) {
        setIsPointImagesLoading(false)
      }
    }

    if (isExtra) {
      setWikiInfo({
        loading: true,
        error: false,
        extract: null,
        url: null
      })
      setIsWikiVisible(true)
      if (baseImages.length === 0) {
        setIsPointImagesLoading(false)
      }
      return
    }

    if (cached.length > 0) {
      setWikiInfo({
        loading: true,
        error: false,
        extract: null,
        url: null
      })
      setIsWikiVisible(true)
      return
    }

    const params = new URLSearchParams({
      routeId: route.id,
      pointIndex: String(index),
      city: route.city || cityTitle,
      title: point.title
    })

    const fetchFromBackend = async (attempt: number) => {
      try {
        const url = `${API_BASE}/api/photos?${params.toString()}`
        const resp = await fetch(url)

        if (!resp.ok) {
          throw new Error(`Bad status ${resp.status}`)
        }

        const data = await resp.json()
        const remotePhotos = extractPhotosFromApi(data)

        if (remotePhotos.length > 0) {
          setPointPhotosCache(prev => ({
            ...prev,
            [cacheKey]: remotePhotos
          }))

          setPointImages(prev => {
            const all = [...prev, ...remotePhotos]
            return Array.from(new Set(all.filter(Boolean)))
          })
          setIsPointImagesLoading(false)
          return
        }

        if (data.status === 'pending' && attempt < 3) {
          setTimeout(() => fetchFromBackend(attempt + 1), 2000)
          return
        }

        setIsPointImagesLoading(false)
      } catch (e) {
        console.error('photos api error', e)
        setIsPointImagesLoading(false)
      }
    }

    fetchFromBackend(0)

    loadCloudPointImages(cityFolder, route.id, index)
      .then(cloudPhotos => {
        if (!cloudPhotos || cloudPhotos.length === 0) return

        setPointPhotosCache(prev => {
          const prevCached = prev[cacheKey] ?? []
          const merged = Array.from(new Set([...prevCached, ...cloudPhotos]))
          return {
            ...prev,
            [cacheKey]: merged
          }
        })

        setPointImages(prev => {
          const all = [...prev, ...cloudPhotos]
          return Array.from(new Set(all.filter(Boolean)))
        })
        setIsPointImagesLoading(false)
      })
      .catch(err => {
        console.error('cloud photos load error', err)
        setIsPointImagesLoading(false)
      })

    setWikiInfo({
      loading: true,
      error: false,
      extract: null,
      url: null
    })
    setIsWikiVisible(true)
  }

  const handleCreateCustomRoute = () => {
    if (!webApp) return

    const payload = {
      type: 'start_custom_route',
      city: cityTitle
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert(
        'Мы отправим данные в ProGid, когда вы будете использовать мини-приложение внутри Telegram.'
      )
    }
  }

  const handleAiRoute = () => {
    if (!webApp) return

    const payload = {
      type: 'ai_route',
      city: cityTitle
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert('Функция доступна внутри Telegram-мини-приложения.')
    }
  }

  const handleAddPlacePhoto = () => {
    if (!webApp || !activeRoute || !activePoint) return

    const payload = {
      type: 'add_place_photo',
      routeId: activeRoute.id,
      routeTitle: activeRoute.title,
      city: activeRoute.city,
      dayTitle: activePoint.dayTitle,
      pointTitle: activePoint.point.title,
      pointTime: activePoint.point.time ?? null
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert(
        'Мы отправили запрос боту. Просто прикрепите фото этого места в чат — мы добавим его к маршруту.'
      )
    }
  }

  const handleRemovePoint = (dayIndex: number, pointIndex: number) => {
    setHiddenPoints(prev => {
      const prevArr = prev[dayIndex] ?? []
      if (prevArr.includes(pointIndex)) return prev
      return {
        ...prev,
        [dayIndex]: [...prevArr, pointIndex]
      }
    })
  }

  const handleRemoveExtraPoint = (dayIndex: number, extraIndex: number) => {
    setExtraPoints(prev => {
      const dayExtras = prev[dayIndex] ?? []
      const newExtras = dayExtras.filter((_, idx) => idx !== extraIndex)
      const next: Record<number, RoutePoint[]> = { ...prev }
      if (newExtras.length === 0) {
        delete next[dayIndex]
      } else {
        next[dayIndex] = newExtras
      }
      return next
    })
  }

  const handleAddPlaceToRoute = (place: PlaceItem) => {
    if (!activeRoute) return
    const dayIndex = activeRoute.days.length - 1

    const newPoint: RoutePoint = {
      title: place.point.title,
      description: place.point.description,
      time: place.point.time,
      images: place.point.images
    }

    setExtraPoints(prev => {
      const dayExtras = prev[dayIndex] ?? []
      return {
        ...prev,
        [dayIndex]: [...dayExtras, newPoint]
      }
    })

    setIsAddPlaceOpen(false)
  }

  const showPrevImage = () => {
    if (pointImages.length === 0) return
    setActiveImageIndex(prev => {
      const len = pointImages.length
      return (prev - 1 + len) % len
    })
  }

  const showNextImage = () => {
    if (pointImages.length === 0) return
    setActiveImageIndex(prev => {
      const len = pointImages.length
      return (prev + 1) % len
    })
  }

  const showPrevMainImage = (imagesCount: number) => {
    if (imagesCount === 0) return
    setMainImageIndex(prev => (prev - 1 + imagesCount) % imagesCount)
  }

  const showNextMainImage = (imagesCount: number) => {
    if (imagesCount === 0) return
    setMainImageIndex(prev => (prev + 1) % imagesCount)
  }

  useEffect(() => {
    if (!activePoint) {
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null
      })
      setIsWikiVisible(false)
      return
    }

    const baseTitle = activePoint.point.title || ''
    let normalizedTitle = baseTitle.trim()

    normalizedTitle = normalizedTitle
      .replace(/^(Обед|Ужин|Завтрак)\s+в\s+районе\s+/i, '')
      .replace(/^(Обед|Ужин|Завтрак)\s+в\s+/i, '')
      .replace(/^(Обед|Ужин|Завтрак)\s+/i, '')
      .replace(/^Переезд\s+в\s+/i, '')
      .trim()

    if (/кафедральный собор и остров канта/i.test(baseTitle)) {
      normalizedTitle = 'Кафедральный собор (Калининград)'
    }

    const fallbackFromDescription =
      activePoint.point.description &&
      activePoint.point.description.length < 40
        ? activePoint.point.description
        : ''

    const titleForWiki = normalizedTitle || fallbackFromDescription

    if (!titleForWiki) {
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null
      })
      setIsWikiVisible(false)
      return
    }

    setWikiInfo({
      loading: true,
      error: false,
      extract: null,
      url: null
    })
    setIsWikiVisible(true)

    let isCancelled = false

    const loadWiki = async () => {
      const data = await fetchWikiExtract(titleForWiki)

      if (isCancelled) return

      if (!data) {
        setWikiInfo({
          loading: false,
          error: true,
          extract: null,
          url: null
        })
        return
      }

      setWikiInfo({
        loading: false,
        error: false,
        extract: data.extract,
        url: data.url
      })
    }

    loadWiki()

    return () => {
      isCancelled = true
    }
  }, [activePoint])

  const handleSelectRoute = (route: PopularRoute) => {
    setActiveRoute(route)
    setMainImageIndex(0)
    setHiddenPoints({})
    setExtraPoints({})
    setIsAddPlaceOpen(false)

    const localImages: string[] = []
    if ((route as any).coverImage) {
      localImages.push((route as any).coverImage as string)
    }
    if (Array.isArray((route as any).images) && (route as any).images.length > 0) {
      localImages.push(...((route as any).images as string[]))
    }

    const uniqLocal = Array.from(new Set(localImages))
    const routeImagesWithCover =
      uniqLocal.length === 0 && cityCoverUrl ? [cityCoverUrl] : uniqLocal

    setRouteImages(routeImagesWithCover)

    if (routeImagesWithCover.length > 0) {
      setMainImageIndex(0)
    }
  }

  const hasRouteInfo =
    typeof activeRoute?.daysCount !== 'undefined' ||
    typeof activeRoute?.distanceKm !== 'undefined' ||
    typeof (activeRoute as any)?.estimatedBudget !== 'undefined' ||
    typeof (activeRoute as any)?.season !== 'undefined'

  const handleClosePointModal = () => {
    setActivePoint(null)
    setPointImages([])
    setActiveImageIndex(0)
    setIsPointImagesLoading(false)
    setWikiInfo({
      loading: false,
      error: false,
      extract: null,
      url: null
    })
    setIsWikiVisible(false)
  }

  const handleSendToMyTrips = () => {
    if (!webApp || !activeRoute) return

    const payload = {
      type: 'save_route_to_trips',
      city: cityTitle,
      routeId: activeRoute.id,
      hiddenPoints,
      extraPoints
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert(
        'Маршрут будет сохранён в "Мои поездки" при запуске мини-приложения в Telegram.'
      )
    }
  }

  const activeRoutePointsCount = activeRoute ? countRoutePoints(activeRoute) : 0
  const activeRoutePreview = activeRoute ? buildRoutePreview(activeRoute) : []

  return (
    <div className="popular-routes-page">
      <div className="pr-header">
        <button className="pr-back-btn" type="button" onClick={onBack}>
          ← Назад
        </button>

        <div className="pr-header-main">
          <h2>Маршруты по городу</h2>
          <div className="pr-header-city">{cityTitle}</div>
          <div className="pr-header-stats">
            <span>{totalRoutesCount} маршрутов</span>
            <span>{totalUniquePoints} мест</span>
            <span>{maxDaysAvailable} макс. дней</span>
          </div>
        </div>
      </div>

      <div className="pr-actions-row">
        <button
          type="button"
          className="pr-create-route-btn"
          onClick={handleCreateCustomRoute}
        >
          Создать свой маршрут
        </button>

        <button
          type="button"
          className={`pr-ai-route-btn ${viewMode === 'ai' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('ai')
            setActiveRoute(null)
          }}
        >
          Маршрут от ИИ
        </button>

        <button
          type="button"
          className={viewMode === 'places' ? 'pr-all-routes-btn active' : 'pr-all-routes-btn'}
          onClick={() => {
            setViewMode('places')
            setActiveRoute(null)
          }}
        >
          Достопримечательности
        </button>

        <button
          type="button"
          className={viewMode === 'routes' ? 'pr-all-routes-btn active' : 'pr-all-routes-btn'}
          onClick={() => {
            setViewMode('routes')
            setActiveRoute(null)
          }}
        >
          Все маршруты
        </button>
      </div>

      {viewMode === 'places' && (
        <div className="places-section">
          <div className="section-title">Достопримечательности города и области</div>
          <div className="section-subtitle">
            Выбирай место, смотри фотографии, краткое описание и добавляй его в свой маршрут.
          </div>

          <div className="pr-top-summary">
            <div className="pr-summary-card">
              <div className="pr-summary-label">Доступно мест</div>
              <div className="pr-summary-value">{totalPlacesCount}</div>
            </div>
            <div className="pr-summary-card">
              <div className="pr-summary-label">Маршрутов в базе</div>
              <div className="pr-summary-value">{totalRoutesCount}</div>
            </div>
            <div className="pr-summary-card">
              <div className="pr-summary-label">Город</div>
              <div className="pr-summary-value">{cityTitle}</div>
            </div>
          </div>

          <div className="pr-places-toolbar">
            <input
              type="text"
              className="pr-places-search"
              placeholder="Поиск по месту, маршруту или дню…"
              value={placesQuery}
              onChange={e => setPlacesQuery(e.target.value)}
            />

            <label className="pr-places-toggle">
              <input
                type="checkbox"
                checked={showOnlyMeaningfulPlaces}
                onChange={e => setShowOnlyMeaningfulPlaces(e.target.checked)}
              />
              <span>Скрыть служебные точки</span>
            </label>
          </div>

          <div className="routes-list">
            {visiblePlaces.map(place => (
              <button
                key={place.id}
                type="button"
                className="route-card route-card-place"
                onClick={() =>
                  openPointModal(place.route, place.dayTitle, place.point, place.pointIndex)
                }
              >
                <div className="route-card-header">
                  <div className="route-card-title">{place.point.title}</div>
                  <div className="route-days">
                    {place.route.title} · {place.dayTitle}
                  </div>
                </div>

                <div className="route-card-badges">
                  <span className="route-card-badge">{place.route.city}</span>
                  {place.point.time && (
                    <span className="route-card-badge route-card-badge-muted">
                      {place.point.time}
                    </span>
                  )}
                </div>

                {place.point.description && (
                  <div className="route-desc">{place.point.description}</div>
                )}
              </button>
            ))}

            {visiblePlaces.length === 0 && (
              <div className="places-empty">
                По этому запросу ничего не найдено. Попробуй убрать фильтр или изменить поиск.
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'ai' && (
        <div className="places-section">
          <div className="section-title">Маршрут от ИИ</div>
          <div className="section-subtitle">
            Скажи, сколько у тебя дней, какой темп прогулки, что интересует больше —
            архитектура, еда, море, музеи или необычные места — и ИИ соберёт маршрут под тебя.
          </div>

          <div className="pr-top-summary">
            <div className="pr-summary-card">
              <div className="pr-summary-label">Город</div>
              <div className="pr-summary-value">{cityTitle}</div>
            </div>
            <div className="pr-summary-card">
              <div className="pr-summary-label">Формат</div>
              <div className="pr-summary-value">Персональный план</div>
            </div>
            <div className="pr-summary-card">
              <div className="pr-summary-label">Подходит для</div>
              <div className="pr-summary-value">1–7 дней</div>
            </div>
          </div>

          <div className="pr-ai-box">
            <div className="pr-ai-list">
              <div className="pr-ai-list-item">Подберём точки под твой темп</div>
              <div className="pr-ai-list-item">Учтём детей, авто, пеший формат</div>
              <div className="pr-ai-list-item">Соберём удобную последовательность мест</div>
              <div className="pr-ai-list-item">Сразу отправим в Telegram</div>
            </div>

            <button type="button" className="pr-create-route-btn" onClick={handleAiRoute}>
              Подобрать маршрут
            </button>
          </div>
        </div>
      )}

      {viewMode === 'routes' && (
        <div className="routes-tab">
          {!activeRoute && (
            <>
              <div className="section-title">Готовые маршруты</div>
              <div className="section-subtitle">
                Выбери сложность, длительность и открой готовый сценарий поездки.
              </div>

              <div className="pr-filters">
                <div className="pr-filter-section">
                  <span className="pr-filter-label">Сложность:</span>
                  <div className="pr-segmented">
                    <button
                      type="button"
                      className={
                        difficultyFilter === 'all'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setDifficultyFilter('all')}
                    >
                      Любая
                    </button>
                    <button
                      type="button"
                      className={
                        difficultyFilter === 'easy'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setDifficultyFilter('easy')}
                    >
                      Лёгкие
                    </button>
                    <button
                      type="button"
                      className={
                        difficultyFilter === 'medium'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setDifficultyFilter('medium')}
                    >
                      Средние
                    </button>
                    <button
                      type="button"
                      className={
                        difficultyFilter === 'hard'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setDifficultyFilter('hard')}
                    >
                      Сложные
                    </button>
                  </div>
                </div>

                <div className="pr-filter-section">
                  <span className="pr-filter-label">Максимум дней:</span>
                  <div className="pr-range-row">
                    <input
                      type="range"
                      min={1}
                      max={maxDaysAvailable}
                      step={1}
                      value={maxDaysFilter}
                      onChange={e => setMaxDaysFilter(Number(e.target.value))}
                    />
                    <span className="pr-range-value">
                      до {maxDaysFilter} {declension('дня', 'дней', 'дней', maxDaysFilter)}
                    </span>
                  </div>
                </div>

                <div className="pr-filter-section">
                  <span className="pr-filter-label">Сортировать по:</span>
                  <div className="pr-segmented">
                    <button
                      type="button"
                      className={
                        sortMode === 'popularity'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setSortMode('popularity')}
                    >
                      Популярности
                    </button>
                    <button
                      type="button"
                      className={
                        sortMode === 'days'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setSortMode('days')}
                    >
                      Количеству дней
                    </button>
                    <button
                      type="button"
                      className={
                        sortMode === 'difficulty'
                          ? 'pr-segmented-btn active'
                          : 'pr-segmented-btn'
                      }
                      onClick={() => setSortMode('difficulty')}
                    >
                      Сложности
                    </button>
                  </div>
                </div>
              </div>

              <div className="routes-list-bottom">
                {visibleRoutes.map(route => {
                  const previewPoints = buildRoutePreview(route)
                  const totalPoints = countRoutePoints(route)

                  return (
                    <button
                      type="button"
                      key={route.id}
                      className="route-card route-card-rich"
                      onClick={() => handleSelectRoute(route)}
                    >
                      <div className="route-card-header">
                        <div className="route-card-title">{route.title}</div>
                        <div className="route-days">
                          {route.daysCount} {declension('день', 'дня', 'дней', route.daysCount)}
                        </div>
                      </div>

                      <div className="route-card-badges">
                        <span
                          className={`route-card-badge route-card-badge-difficulty ${routeDifficultyClass(
                            route.difficulty
                          )}`}
                        >
                          {routeDifficultyLabel(route.difficulty)}
                        </span>

                        {typeof route.distanceKm !== 'undefined' && (
                          <span className="route-card-badge">~{route.distanceKm} км</span>
                        )}

                        <span className="route-card-badge">{totalPoints} точек</span>

                        {(route as any).season && (
                          <span className="route-card-badge route-card-badge-muted">
                            {(route as any).season}
                          </span>
                        )}
                      </div>

                      <div className="route-desc">{route.shortDescription}</div>

                      {previewPoints.length > 0 && (
                        <div className="route-preview-points">
                          {previewPoints.map(pointTitle => (
                            <span key={pointTitle} className="route-preview-point">
                              {pointTitle}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {activeRoute && (
            <div className="route-detail-page">
              <button
                type="button"
                className="pr-back-btn"
                onClick={() => setActiveRoute(null)}
              >
                ← Назад к маршрутам
              </button>

              <div className="route-detail-card">
                <div className="route-detail-header">
                  <h3>{activeRoute.title}</h3>
                  <div className="route-detail-subtitle">
                    {activeRoute.daysCount}{' '}
                    {declension('день', 'дня', 'дней', activeRoute.daysCount)}
                  </div>
                </div>

                {routeImages.length > 0 && (
                  <div className="route-main-carousel">
                    <div className="route-main-carousel-inner">
                      {routeImages.length > 1 && (
                        <button
                          type="button"
                          className="route-main-carousel-btn left"
                          onClick={() => showPrevMainImage(routeImages.length)}
                        >
                          ◀
                        </button>
                      )}

                      <img
                        src={routeImages[mainImageIndex % routeImages.length]}
                        alt={activeRoute.title}
                        className="route-main-carousel-image"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />

                      {routeImages.length > 1 && (
                        <button
                          type="button"
                          className="route-main-carousel-btn right"
                          onClick={() => showNextMainImage(routeImages.length)}
                        >
                          ▶
                        </button>
                      )}
                    </div>

                    {routeImages.length > 1 && (
                      <div className="route-main-carousel-dots">
                        {routeImages.map((img, idx) => (
                          <button
                            key={`${img}-${idx}`}
                            type="button"
                            className={
                              idx === mainImageIndex
                                ? 'route-main-carousel-dot active'
                                : 'route-main-carousel-dot'
                            }
                            onClick={() => setMainImageIndex(idx)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="route-detail-overview">
                  <div className="route-overview-card">
                    <div className="route-overview-label">Дней</div>
                    <div className="route-overview-value">{activeRoute.daysCount}</div>
                  </div>

                  <div className="route-overview-card">
                    <div className="route-overview-label">Точек</div>
                    <div className="route-overview-value">{activeRoutePointsCount}</div>
                  </div>

                  {typeof activeRoute.distanceKm !== 'undefined' && (
                    <div className="route-overview-card">
                      <div className="route-overview-label">Протяжённость</div>
                      <div className="route-overview-value">~{activeRoute.distanceKm} км</div>
                    </div>
                  )}

                  {typeof (activeRoute as any).estimatedBudget !== 'undefined' && (
                    <div className="route-overview-card">
                      <div className="route-overview-label">Бюджет</div>
                      <div className="route-overview-value">
                        от {(activeRoute as any).estimatedBudget} ₽
                      </div>
                    </div>
                  )}

                  {(activeRoute as any).season && (
                    <div className="route-overview-card">
                      <div className="route-overview-label">Сезон</div>
                      <div className="route-overview-value">{(activeRoute as any).season}</div>
                    </div>
                  )}

                  <div className="route-overview-card">
                    <div className="route-overview-label">Сложность</div>
                    <div className="route-overview-value">
                      {routeDifficultyLabel(activeRoute.difficulty)}
                    </div>
                  </div>
                </div>

                {hasRouteInfo && (
                  <div className="route-detail-meta">
                    {typeof activeRoute.distanceKm !== 'undefined' && (
                      <div>Протяжённость: ~{activeRoute.distanceKm} км</div>
                    )}
                    {typeof (activeRoute as any).estimatedBudget !== 'undefined' && (
                      <div>
                        Ориентировочный бюджет: от {(activeRoute as any).estimatedBudget} ₽
                      </div>
                    )}
                    {(activeRoute as any).season && (
                      <div>Лучшее время: {(activeRoute as any).season}</div>
                    )}
                  </div>
                )}

                {activeRoutePreview.length > 0 && (
                  <div className="route-preview-points route-preview-points-detail">
                    {activeRoutePreview.map(pointTitle => (
                      <span key={pointTitle} className="route-preview-point">
                        {pointTitle}
                      </span>
                    ))}
                  </div>
                )}

                <div className="route-days-list">
                  {activeRoute.days.map((day, dayIndex) => {
                    const hiddenForDay = hiddenPoints[dayIndex] ?? []
                    const dayExtra = extraPoints[dayIndex] ?? []

                    return (
                      <div key={dayIndex} className="route-day-block">
                        <div className="route-day-header">
                          <div className="route-day-title">{day.title}</div>
                          {day.description && (
                            <div className="route-day-description">{day.description}</div>
                          )}
                        </div>

                        <ul className="route-points-list">
                          {day.points.map((point, index) => {
                            if (hiddenForDay.includes(index)) return null

                            return (
                              <li key={index} className="route-point-li">
                                <button
                                  type="button"
                                  className="route-point-item"
                                  onClick={() =>
                                    openPointModal(activeRoute, day.title, point, index)
                                  }
                                >
                                  {point.time && (
                                    <span className="route-point-time">{point.time}</span>
                                  )}

                                  <div className="route-point-main">
                                    <div className="route-point-title">{point.title}</div>
                                    {point.description && (
                                      <div className="route-point-description">
                                        {point.description}
                                      </div>
                                    )}
                                  </div>
                                </button>

                                <button
                                  type="button"
                                  className="route-point-remove-btn"
                                  onClick={() => handleRemovePoint(dayIndex, index)}
                                >
                                  ✕
                                </button>
                              </li>
                            )
                          })}

                          {dayExtra.map((point, exIndex) => (
                            <li
                              key={`extra-${exIndex}`}
                              className="route-point-li route-point-li-extra"
                            >
                              <button
                                type="button"
                                className="route-point-item"
                                onClick={() =>
                                  openPointModal(activeRoute, day.title, point, -1 - exIndex)
                                }
                              >
                                {point.time && (
                                  <span className="route-point-time">{point.time}</span>
                                )}

                                <div className="route-point-main">
                                  <div className="route-point-title">{point.title}</div>
                                  {point.description && (
                                    <div className="route-point-description">
                                      {point.description}
                                    </div>
                                  )}
                                </div>
                              </button>

                              <button
                                type="button"
                                className="route-point-remove-btn"
                                onClick={() => handleRemoveExtraPoint(dayIndex, exIndex)}
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>

                <div className="route-add-place-block">
                  <button
                    type="button"
                    className="route-add-place-toggle"
                    onClick={() => setIsAddPlaceOpen(prev => !prev)}
                  >
                    + Добавить место в маршрут
                  </button>

                  {isAddPlaceOpen && (
                    <div className="route-add-place-list">
                      {visiblePlaces.map(place => (
                        <button
                          key={`add-${place.id}`}
                          type="button"
                          className="route-add-place-item"
                          onClick={() => handleAddPlaceToRoute(place)}
                        >
                          <div className="route-add-place-title">{place.point.title}</div>
                          {place.point.description && (
                            <div className="route-add-place-subtitle">
                              {place.point.description}
                            </div>
                          )}
                        </button>
                      ))}

                      {visiblePlaces.length === 0 && (
                        <div className="places-empty">Нет подходящих мест для добавления.</div>
                      )}
                    </div>
                  )}
                </div>

                {getEmbedUrl(activeRoute) && (
                  <div className="route-map-wrapper">
                    <iframe
                      src={getEmbedUrl(activeRoute)}
                      title="Маршрут на карте"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                      style={{
                        width: '100%',
                        minHeight: '300px',
                        border: 0,
                        borderRadius: '16px',
                        overflow: 'hidden',
                        marginTop: '16px',
                        marginBottom: '16px'
                      }}
                    />
                  </div>
                )}

                {(activeRoute as any).yandexMapUrl && (
                  <a
                    href={(activeRoute as any).yandexMapUrl as string}
                    target="_blank"
                    rel="noreferrer"
                    className="pr-open-in-maps"
                  >
                    Открыть маршрут в Яндекс.Картах
                  </a>
                )}

                <button
                  type="button"
                  className="route-send-to-trips-btn"
                  onClick={handleSendToMyTrips}
                >
                  Отправить в мои поездки
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activePoint && (
        <div className="point-modal-backdrop" onClick={handleClosePointModal}>
          <div
            className="point-modal"
            onClick={e => {
              e.stopPropagation()
            }}
          >
            <div className="point-modal-header">
              <button
                type="button"
                className="point-modal-close"
                onClick={handleClosePointModal}
              >
                ✕
              </button>

              <div className="point-modal-title">{activePoint.point.title}</div>

              {activePoint.point.time && (
                <div className="point-modal-time">{activePoint.point.time}</div>
              )}

              <div className="point-modal-day">{activePoint.dayTitle}</div>
            </div>

            {isPointImagesLoading && pointImages.length === 0 && (
              <div className="point-modal-loading">Загружаем фотографии места…</div>
            )}

            {pointImages.length > 0 && (
              <div className="point-modal-carousel">
                <div className="point-modal-carousel-inner">
                  {pointImages.length > 1 && (
                    <button
                      type="button"
                      className="point-modal-carousel-btn left"
                      onClick={showPrevImage}
                    >
                      ◀
                    </button>
                  )}

                  <img
                    src={pointImages[activeImageIndex % pointImages.length]}
                    alt={activePoint.point.title}
                    className="point-modal-image"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />

                  {pointImages.length > 1 && (
                    <button
                      type="button"
                      className="point-modal-carousel-btn right"
                      onClick={showNextImage}
                    >
                      ▶
                    </button>
                  )}
                </div>

                {pointImages.length > 1 && (
                  <div className="point-modal-thumbs">
                    {pointImages.map((img, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        type="button"
                        className={
                          idx === activeImageIndex
                            ? 'point-modal-thumb active'
                            : 'point-modal-thumb'
                        }
                        onClick={() => setActiveImageIndex(idx)}
                      >
                        <img src={img} alt={`${activePoint.point.title} ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isPointImagesLoading && pointImages.length === 0 && (
              <div className="point-modal-no-images">
                Пока нет фотографий этого места. Ты можешь добавить их сам.
              </div>
            )}

            <button
              type="button"
              className="point-modal-add-photo-btn"
              onClick={handleAddPlacePhoto}
            >
              + Добавить фото этого места
            </button>

            {activePoint.point.description && (
              <div className="point-modal-inline-description">
                {activePoint.point.description}
              </div>
            )}

            {isWikiVisible && (
              <div className="point-modal-wiki">
                {wikiInfo.loading && <div>Загружаем описание…</div>}

                {wikiInfo.error && !wikiInfo.extract && (
                  <div>
                    Не удалось загрузить описание с Википедии. Попробуйте позже или
                    откройте это место на карте.
                  </div>
                )}

                {!wikiInfo.loading && wikiInfo.extract && (
                  <>
                    <div className="point-modal-wiki-extract">{wikiInfo.extract}</div>
                    {wikiInfo.url && (
                      <a
                        href={wikiInfo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="point-modal-wiki-link"
                      >
                        Открыть статью в Википедии
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}