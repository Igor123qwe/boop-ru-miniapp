import React, { useEffect, useMemo, useRef, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import './PopularRoutesPage.css'

type Props = {
  city: string
  onBack: () => void
  initialRouteId?: string
}

type SortMode = 'popularity' | 'days' | 'difficulty'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'
type ViewMode = 'places' | 'ai' | 'routes'

type ActivePointState = {
  routeId: string
  dayTitle: string
  dayIndex: number
  pointIndex: number
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

type PlaceItem = {
  id: string
  route: PopularRoute
  dayIndex: number
  dayTitle: string
  pointIndex: number
  point: {
    title: string
    time?: string
    description?: string
    images?: string[]
  }
}

type RoutePoint = PopularRoute['days'][number]['points'][number]

type SavedTrip = {
  id: string
  city: string
  routeId: string
  title: string
  shortDescription?: string
  daysCount: number
  difficulty?: string
  distanceKm?: number
  estimatedBudget?: number
  season?: string
  coverImage?: string
  hiddenPoints: Record<number, number[]>
  extraPoints: Record<number, RoutePoint[]>
  routeSnapshot: PopularRoute
  createdAt: string
  updatedAt: string
}

const LOCAL_TRIPS_KEY = 'progid_my_trips'

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

const getAllRoutes = (): PopularRoute[] => {
  const arrays = Object.values(POPULAR_ROUTES)
  return arrays.flat()
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

const getDefaultApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4000'
    }
  }

  return 'https://progid-backend.vercel.app'
}

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  getDefaultApiBase()

const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images-novichihin'

const getCityCoverUrl = (cityFolder: string): string =>
  `${CLOUD_BASE_URL}/${cityFolder}/city-cover.jpg`

const MAX_CLOUD_POINT_IMAGES = 8

const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim()
}

const cleanupPlaceTitle = (title: string): string => {
  return normalizeText(title)
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
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

const buildPointSlug = (title?: string, fallback = 'point'): string => {
  const clean = cleanupPlaceTitle(title || '')
  const slug = slugify(clean)
  return slug || fallback
}

const buildPointCacheKey = (
  routeId: string,
  dayIndex: number,
  pointIndex: number,
  title?: string
): string => {
  const pointSlug = buildPointSlug(title, `point_${pointIndex}`)
  return `${routeId}_${dayIndex}_${pointIndex}_${pointSlug}`
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

  const candidates: unknown[] = [
    data.photos,
    data.publicUrls,
    data.urls,
    data.images,
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

const prepareYandexEmbed = (raw: string): string => {
  const urlStr = raw.startsWith('https://yandex.ru/maps/')
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
      if (!points.includes(title)) points.push(title)
      if (points.length >= 3) return points
    }
  }
  return points
}

const stripHtml = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

const cleanWikiExtract = (text: string): string => {
  return normalizeText(stripHtml(text))
    .replace(/\[\d+\]/g, '')
    .replace(/\s+\./g, '.')
}

const uniqueStrings = (items: string[]): string[] => {
  return Array.from(new Set(items.map(i => i.trim()).filter(Boolean)))
}

const buildWikiCandidates = (
  rawTitle: string,
  cityTitle: string,
  pointDescription?: string
): string[] => {
  const title = normalizeText(rawTitle)
  const city = normalizeText(cityTitle)
  const cleaned = cleanupPlaceTitle(title)

  const aliasMap: Record<string, string[]> = {
    'верхнее озеро и парк «юность»': [
      'Верхнее озеро (Калининград)',
      'Парк Юность (Калининград)',
      'Верхнее озеро Калининград',
      'Парк Юность Калининград',
    ],
    'верхнее озеро и парк "юность"': [
      'Верхнее озеро (Калининград)',
      'Парк Юность (Калининград)',
      'Верхнее озеро Калининград',
      'Парк Юность Калининград',
    ],
    'кафедральный собор и остров канта': [
      'Кафедральный собор (Калининград)',
      'Остров Канта',
      'Кнайпхоф',
    ],
    'рыбная деревня': ['Рыбная деревня (Калининград)'],
    'музей мирового океана': ['Музей Мирового океана'],
    'нижнее озеро': ['Нижнее озеро (Калининград)', 'Нижнее озеро Калининград'],
    'верхнее озеро': ['Верхнее озеро (Калининград)', 'Верхнее озеро Калининград'],
  }

  const aliases = aliasMap[cleaned.toLowerCase()] ?? []

  const descriptionBased: string[] = []
  if (pointDescription) {
    const desc = normalizeText(pointDescription)
    if (desc.length > 3 && desc.length < 80) {
      descriptionBased.push(desc)
    }
  }

  return uniqueStrings([
    cleaned,
    `${cleaned} (${city})`,
    `${cleaned} ${city}`,
    ...aliases,
    ...descriptionBased,
  ])
}

const fetchWikiSummaryDirect = async (
  title: string
): Promise<{ extract: string; url: string } | null> => {
  try {
    const summaryUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`

    const res = await fetch(summaryUrl, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) return null

    const data = await res.json()

    const rawExtract =
      typeof data.extract === 'string'
        ? data.extract
        : typeof data.extract_html === 'string'
          ? data.extract_html
          : typeof data.description === 'string'
            ? data.description
            : ''

    const extract = cleanWikiExtract(rawExtract)
    const url =
      data?.content_urls?.desktop?.page ||
      `https://ru.wikipedia.org/wiki/${encodeURIComponent(title)}`

    if (!extract) return null

    return { extract, url }
  } catch {
    return null
  }
}

const fetchWikiBySearch = async (
  title: string
): Promise<{ extract: string; url: string } | null> => {
  try {
    const searchUrl = `https://ru.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      title
    )}&limit=1&namespace=0&format=json&origin=*`

    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null

    const searchData = (await searchRes.json()) as [string, string[], string[], string[]]
    const foundTitle = searchData[1]?.[0]
    if (!foundTitle) return null

    return await fetchWikiSummaryDirect(foundTitle)
  } catch {
    return null
  }
}

const fetchWikiExtract = async (
  rawTitle: string,
  cityTitle: string,
  pointDescription?: string
): Promise<{ extract: string; url: string } | null> => {
  const candidates = buildWikiCandidates(rawTitle, cityTitle, pointDescription)

  for (const candidate of candidates) {
    const direct = await fetchWikiSummaryDirect(candidate)
    if (direct) return direct

    const searched = await fetchWikiBySearch(candidate)
    if (searched) return searched
  }

  return null
}

const readSavedTrips = (): SavedTrip[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveTripToLocalStorage = (trip: SavedTrip): void => {
  const current = readSavedTrips()
  const existingIndex = current.findIndex(
    item => item.routeId === trip.routeId && item.city === trip.city
  )

  if (existingIndex >= 0) {
    current[existingIndex] = {
      ...current[existingIndex],
      ...trip,
      createdAt: current[existingIndex].createdAt,
      updatedAt: new Date().toISOString(),
    }
  } else {
    current.unshift(trip)
  }

  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(current))
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

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack, initialRouteId }) => {
  const { webApp } = useTelegramWebApp()
  const pointRequestRef = useRef(0)

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
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')

  const maxDaysAvailable =
    routes.length > 0 ? Math.max(...routes.map(r => r.daysCount)) : 1

  const [maxDaysFilter, setMaxDaysFilter] = useState<number>(maxDaysAvailable)
  const [mainImageIndex, setMainImageIndex] = useState<number>(0)
  const [routeImages, setRouteImages] = useState<string[]>([])
  const [failedRouteImages, setFailedRouteImages] = useState<Record<string, boolean>>({})

  const [activePoint, setActivePoint] = useState<ActivePointState | null>(null)
  const [pointImages, setPointImages] = useState<string[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [isPointImagesLoading, setIsPointImagesLoading] = useState<boolean>(false)
  const [failedPointImages, setFailedPointImages] = useState<Record<string, boolean>>({})

  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [zoomedImageTitle, setZoomedImageTitle] = useState<string>('')

  const [wikiInfo, setWikiInfo] = useState<WikiState>({
    loading: false,
    error: false,
    extract: null,
    url: null,
  })
  const [isWikiVisible, setIsWikiVisible] = useState<boolean>(false)

  const [pointPhotosCache, setPointPhotosCache] = useState<Record<string, string[]>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('routes')
  const [hiddenPoints, setHiddenPoints] = useState<Record<number, number[]>>({})
  const [extraPoints, setExtraPoints] = useState<Record<number, RoutePoint[]>>({})
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false)
  const [placesQuery, setPlacesQuery] = useState('')
  const [showOnlyMeaningfulPlaces, setShowOnlyMeaningfulPlaces] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')

  const visibleRouteImages = useMemo(
    () => routeImages.filter(img => !failedRouteImages[img]),
    [routeImages, failedRouteImages]
  )

  const visiblePointImages = useMemo(
    () => pointImages.filter(img => !failedPointImages[img]),
    [pointImages, failedPointImages]
  )

  useEffect(() => {
    if (!activeRoute) {
      setMainImageIndex(0)
      setRouteImages([])
      setFailedRouteImages({})
      setActivePoint(null)
      setPointImages([])
      setFailedPointImages({})
      setActiveImageIndex(0)
      setIsPointImagesLoading(false)
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null,
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

  useEffect(() => {
    if (!saveMessage) return
    const timer = setTimeout(() => setSaveMessage(''), 2200)
    return () => clearTimeout(timer)
  }, [saveMessage])

  useEffect(() => {
    if (visibleRouteImages.length === 0) {
      setMainImageIndex(0)
      return
    }
    if (mainImageIndex >= visibleRouteImages.length) {
      setMainImageIndex(0)
    }
  }, [visibleRouteImages.length, mainImageIndex])

  useEffect(() => {
    if (visiblePointImages.length === 0) {
      setActiveImageIndex(0)
      return
    }
    if (activeImageIndex >= visiblePointImages.length) {
      setActiveImageIndex(0)
    }
  }, [visiblePointImages.length, activeImageIndex])

  useEffect(() => {
    const shouldLock = !!activePoint || !!zoomedImage
    const prevOverflow = document.body.style.overflow

    if (shouldLock) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [activePoint, zoomedImage])

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
            dayIndex: dayIdx,
            dayTitle: day.title,
            pointIndex: pointIdx,
            point,
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

  const openZoomImage = (src: string, title: string) => {
    setZoomedImage(src)
    setZoomedImageTitle(title)
  }

  const closeZoomImage = () => {
    setZoomedImage(null)
    setZoomedImageTitle('')
  }

  const fetchStoredPhotosFromBackend = async (
    params: URLSearchParams
  ): Promise<string[]> => {
    const photosUrls = [
      `${API_BASE}/api/photos?${params.toString()}`,
      `${API_BASE}/photos?${params.toString()}`,
    ]

    for (const url of photosUrls) {
      try {
        const resp = await withTimeout(
          url,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
          15000
        )

        if (!resp.ok) continue

        const parsed = await safeJson(resp)
        if (!parsed.ok) continue

        const remotePhotos = extractPhotosFromApi(parsed.data)
        if (remotePhotos.length > 0) {
          return remotePhotos
        }
      } catch (e) {
        console.error('photos api error', url, e)
      }
    }

    return []
  }

  const fetchParsedPhotosFromBackend = async (
    params: URLSearchParams
  ): Promise<string[]> => {
    const parsePayload = {
      routeId: params.get('routeId') || undefined,
      dayIndex: params.get('dayIndex') || undefined,
      pointIndex: params.get('pointIndex') || undefined,
      city: params.get('city') || undefined,
      title: params.get('title') || undefined,
      limit: 6,
    }

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
            body: JSON.stringify(parsePayload),
          },
          60000
        )

        if (!resp.ok) continue

        const parsed = await safeJson(resp)
        if (!parsed.ok) continue

        const remotePhotos = extractPhotosFromApi(parsed.data)
        if (remotePhotos.length > 0) {
          return remotePhotos
        }
      } catch (e) {
        console.error('parse api error', url, e)
      }
    }

    return []
  }

  const openPointModal = async (
    route: PopularRoute,
    dayTitle: string,
    dayIndex: number,
    point: {
      title: string
      time?: string
      description?: string
      images?: string[]
    },
    pointIndex: number
  ) => {
    const currentRequestId = ++pointRequestRef.current
    const isExtra = pointIndex < 0

    const cacheKey = isExtra
      ? `extra_${buildPointCacheKey(route.id, dayIndex, Math.abs(pointIndex), point.title)}`
      : buildPointCacheKey(route.id, dayIndex, pointIndex, point.title)

    setActiveRoute(route)
    setActivePoint({
      routeId: route.id,
      dayTitle,
      dayIndex,
      pointIndex,
      point,
    })
    setActiveImageIndex(0)
    setFailedPointImages({})

    const baseImages = Array.isArray(point.images) ? point.images.filter(Boolean) : []
    const cached = pointPhotosCache[cacheKey] ?? []
    const existingImages = Array.from(new Set([...baseImages, ...cached]))

    setPointImages(existingImages)
    setIsPointImagesLoading(existingImages.length === 0)

    setWikiInfo({
      loading: true,
      error: false,
      extract: null,
      url: null,
    })
    setIsWikiVisible(true)

    // Для вручную добавленных extra-точек ничего не парсим автоматически,
    // используем только то, что уже есть у точки.
    if (isExtra) {
      if (existingImages.length === 0) {
        setIsPointImagesLoading(false)
      }
      return
    }

    // Если фото уже есть в данных маршрута или в кэше —
    // вообще никуда не идём и ничего не парсим.
    if (existingImages.length > 0) {
      setIsPointImagesLoading(false)
      return
    }

    const params = new URLSearchParams({
      routeId: route.id,
      dayIndex: String(dayIndex),
      pointIndex: String(pointIndex),
      city: route.city || cityTitle,
      title: point.title || '',
    })

    try {
      const storedPhotos = await fetchStoredPhotosFromBackend(params)

      if (pointRequestRef.current !== currentRequestId) return

      if (storedPhotos.length > 0) {
        setPointPhotosCache(prev => ({
          ...prev,
          [cacheKey]: storedPhotos,
        }))
        setPointImages(storedPhotos)
        setIsPointImagesLoading(false)
        return
      }
    } catch (e) {
      console.error('backend stored point photos load error', e)
    }

    try {
      const cloudPhotos = await loadCloudPointImages(
        cityFolder,
        route.id,
        dayIndex,
        pointIndex,
        point.title
      )

      if (pointRequestRef.current !== currentRequestId) return

      if (cloudPhotos.length > 0) {
        setPointPhotosCache(prev => ({
          ...prev,
          [cacheKey]: cloudPhotos,
        }))
        setPointImages(cloudPhotos)
        setIsPointImagesLoading(false)
        return
      }
    } catch (e) {
      console.error('cloud photos load error', e)
    }

    // И только если фото нет вообще нигде:
    // - ни в point.images
    // - ни в кэше
    // - ни в /api/photos
    // - ни в cloud storage
    // запускаем parse.
    try {
      const parsedPhotos = await fetchParsedPhotosFromBackend(params)

      if (pointRequestRef.current !== currentRequestId) return

      if (parsedPhotos.length > 0) {
        setPointPhotosCache(prev => ({
          ...prev,
          [cacheKey]: parsedPhotos,
        }))
        setPointImages(parsedPhotos)
      }

      setIsPointImagesLoading(false)
    } catch (e) {
      console.error('backend parse point photos error', e)
      if (pointRequestRef.current === currentRequestId) {
        setIsPointImagesLoading(false)
      }
    }
  }

  const handleCreateCustomRoute = () => {
    const payload = {
      type: 'start_custom_route',
      city: cityTitle,
    }

    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(payload))
    } else {
      alert(
        'Мы отправим данные в ProGid, когда вы будете использовать мини-приложение внутри Telegram.'
      )
    }
  }

  const handleAiRoute = () => {
    const payload = {
      type: 'ai_route',
      city: cityTitle,
    }

    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(payload))
    } else {
      alert('Функция доступна внутри Telegram-мини-приложения.')
    }
  }

  const handleAddPlacePhoto = () => {
    if (!activeRoute || !activePoint) return

    const payload = {
      type: 'add_place_photo',
      routeId: activeRoute.id,
      routeTitle: activeRoute.title,
      city: activeRoute.city,
      dayTitle: activePoint.dayTitle,
      dayIndex: activePoint.dayIndex,
      pointIndex: activePoint.pointIndex,
      pointTitle: activePoint.point.title,
      pointTime: activePoint.point.time ?? null,
    }

    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(payload))
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
        [dayIndex]: [...prevArr, pointIndex],
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
      images: place.point.images,
    }

    setExtraPoints(prev => {
      const dayExtras = prev[dayIndex] ?? []
      const exists = dayExtras.some(
        item =>
          item.title === newPoint.title &&
          item.time === newPoint.time &&
          item.description === newPoint.description
      )

      if (exists) return prev

      return {
        ...prev,
        [dayIndex]: [...dayExtras, newPoint],
      }
    })

    setIsAddPlaceOpen(false)
  }

  const showPrevImage = () => {
    if (visiblePointImages.length === 0) return
    setActiveImageIndex(prev => {
      const len = visiblePointImages.length
      return (prev - 1 + len) % len
    })
  }

  const showNextImage = () => {
    if (visiblePointImages.length === 0) return
    setActiveImageIndex(prev => {
      const len = visiblePointImages.length
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
    if (!activePoint || !activeRoute) {
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null,
      })
      setIsWikiVisible(false)
      return
    }

    const titleForWiki = activePoint.point.title || ''
    const descriptionForWiki = activePoint.point.description || ''

    if (!titleForWiki.trim()) {
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null,
      })
      setIsWikiVisible(false)
      return
    }

    setWikiInfo({
      loading: true,
      error: false,
      extract: null,
      url: null,
    })
    setIsWikiVisible(true)

    let isCancelled = false

    const loadWiki = async () => {
      const data = await fetchWikiExtract(
        titleForWiki,
        activeRoute.city || cityTitle,
        descriptionForWiki
      )

      if (isCancelled) return

      if (!data) {
        setWikiInfo({
          loading: false,
          error: true,
          extract: null,
          url: null,
        })
        return
      }

      setWikiInfo({
        loading: false,
        error: false,
        extract: data.extract,
        url: data.url,
      })
    }

    loadWiki()

    return () => {
      isCancelled = true
    }
  }, [activePoint, activeRoute, cityTitle])

  const handleSelectRoute = (route: PopularRoute) => {
    setActiveRoute(route)
    setMainImageIndex(0)
    setHiddenPoints({})
    setExtraPoints({})
    setIsAddPlaceOpen(false)
    setFailedRouteImages({})

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

  useEffect(() => {
    if (!initialRouteId) return
    if (activeRoute?.id === initialRouteId) return

    const found = routes.find(route => route.id === initialRouteId)
    if (!found) return

    handleSelectRoute(found)
  }, [initialRouteId, activeRoute, routes])

  const hasRouteInfo =
    typeof activeRoute?.daysCount !== 'undefined' ||
    typeof activeRoute?.distanceKm !== 'undefined' ||
    typeof (activeRoute as any)?.estimatedBudget !== 'undefined' ||
    typeof (activeRoute as any)?.season !== 'undefined'

  const handleClosePointModal = () => {
    pointRequestRef.current += 1
    setActivePoint(null)
    setPointImages([])
    setFailedPointImages({})
    setActiveImageIndex(0)
    setIsPointImagesLoading(false)
    setWikiInfo({
      loading: false,
      error: false,
      extract: null,
      url: null,
    })
    setIsWikiVisible(false)
  }

  const handleSendToMyTrips = () => {
    if (!activeRoute) return

    const now = new Date().toISOString()

    const savedTrip: SavedTrip = {
      id: `${activeRoute.id}_${cityTitle}`,
      city: cityTitle,
      routeId: activeRoute.id,
      title: activeRoute.title,
      shortDescription: activeRoute.shortDescription,
      daysCount: activeRoute.daysCount,
      difficulty: activeRoute.difficulty,
      distanceKm: activeRoute.distanceKm,
      estimatedBudget: (activeRoute as any).estimatedBudget,
      season: (activeRoute as any).season,
      coverImage:
        visibleRouteImages[0] ||
        ((activeRoute as any).coverImage as string | undefined) ||
        cityCoverUrl,
      hiddenPoints,
      extraPoints,
      routeSnapshot: activeRoute,
      createdAt: now,
      updatedAt: now,
    }

    saveTripToLocalStorage(savedTrip)

    const payload = {
      type: 'save_route_to_trips',
      city: cityTitle,
      routeId: activeRoute.id,
      title: activeRoute.title,
      hiddenPoints,
      extraPoints,
      savedAt: now,
    }

    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify(payload))
    }

    setSaveMessage('Маршрут сохранён в «Мои поездки»')
  }

  const activeRoutePointsCount = activeRoute ? countRoutePoints(activeRoute) : 0
  const activeRoutePreview = activeRoute ? buildRoutePreview(activeRoute) : []

  return (
    <div className="popular-routes-page">
      {saveMessage && <div className="pr-save-toast">{saveMessage}</div>}

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
            Выбирай место, смотри фотографии, описание и добавляй его в свой маршрут.
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
                  openPointModal(
                    place.route,
                    place.dayTitle,
                    place.dayIndex,
                    place.point,
                    place.pointIndex
                  )
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

              <div className="pr-top-summary">
                <div className="pr-summary-card">
                  <div className="pr-summary-label">Всего маршрутов</div>
                  <div className="pr-summary-value">{visibleRoutes.length}</div>
                </div>
                <div className="pr-summary-card">
                  <div className="pr-summary-label">Уникальных мест</div>
                  <div className="pr-summary-value">{totalUniquePoints}</div>
                </div>
                <div className="pr-summary-card">
                  <div className="pr-summary-label">Диапазон</div>
                  <div className="pr-summary-value">1–{maxDaysAvailable} дней</div>
                </div>
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

                {visibleRouteImages.length > 0 && (
                  <div className="route-main-carousel">
                    <div className="route-main-carousel-inner">
                      {visibleRouteImages.length > 1 && (
                        <button
                          type="button"
                          className="route-main-carousel-btn left"
                          onClick={() => showPrevMainImage(visibleRouteImages.length)}
                        >
                          ◀
                        </button>
                      )}

                      <img
                        src={visibleRouteImages[mainImageIndex % visibleRouteImages.length]}
                        alt={activeRoute.title}
                        className="route-main-carousel-image"
                        onClick={() =>
                          openZoomImage(
                            visibleRouteImages[mainImageIndex % visibleRouteImages.length],
                            activeRoute.title
                          )
                        }
                        onError={() => {
                          const broken =
                            visibleRouteImages[mainImageIndex % visibleRouteImages.length]
                          setFailedRouteImages(prev => ({ ...prev, [broken]: true }))
                        }}
                      />

                      {visibleRouteImages.length > 1 && (
                        <button
                          type="button"
                          className="route-main-carousel-btn right"
                          onClick={() => showNextMainImage(visibleRouteImages.length)}
                        >
                          ▶
                        </button>
                      )}
                    </div>

                    {visibleRouteImages.length > 1 && (
                      <div className="route-main-carousel-dots">
                        {visibleRouteImages.map((img, idx) => (
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
                                    openPointModal(activeRoute, day.title, dayIndex, point, index)
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
                                  openPointModal(
                                    activeRoute,
                                    day.title,
                                    dayIndex,
                                    point,
                                    -1 - exIndex
                                  )
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
                        marginBottom: '16px',
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

            {isPointImagesLoading && visiblePointImages.length === 0 && (
              <div className="point-modal-loading">Загружаем фотографии места…</div>
            )}

            {visiblePointImages.length > 0 && (
              <div className="point-modal-carousel">
                <div className="point-modal-carousel-inner">
                  {visiblePointImages.length > 1 && (
                    <button
                      type="button"
                      className="point-modal-carousel-btn left"
                      onClick={showPrevImage}
                    >
                      ◀
                    </button>
                  )}

                  <img
                    src={visiblePointImages[activeImageIndex % visiblePointImages.length]}
                    alt={activePoint.point.title}
                    className="point-modal-image"
                    onClick={() =>
                      openZoomImage(
                        visiblePointImages[activeImageIndex % visiblePointImages.length],
                        activePoint.point.title
                      )
                    }
                    onError={() => {
                      const broken =
                        visiblePointImages[activeImageIndex % visiblePointImages.length]
                      setFailedPointImages(prev => ({ ...prev, [broken]: true }))
                    }}
                  />

                  {visiblePointImages.length > 1 && (
                    <button
                      type="button"
                      className="point-modal-carousel-btn right"
                      onClick={showNextImage}
                    >
                      ▶
                    </button>
                  )}
                </div>

                {visiblePointImages.length > 1 && (
                  <div className="point-modal-thumbs">
                    {visiblePointImages.map((img, idx) => (
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
                        <img
                          src={img}
                          alt={`${activePoint.point.title} ${idx + 1}`}
                          onError={() => {
                            setFailedPointImages(prev => ({ ...prev, [img]: true }))
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isPointImagesLoading && visiblePointImages.length === 0 && (
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

      {zoomedImage && (
        <div className="image-zoom-backdrop" onClick={closeZoomImage}>
          <div className="image-zoom-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="image-zoom-close"
              onClick={closeZoomImage}
            >
              ✕
            </button>

            <img
              src={zoomedImage}
              alt={zoomedImageTitle}
              className="image-zoom-img"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PopularRoutesPage