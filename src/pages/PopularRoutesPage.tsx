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
  const c = city.toLowerCase()

  if (c.includes('калининг')) return 'kaliningrad'
  if (c.includes('mосква') || c.includes('моск')) return 'moscow'
  if (c.includes('петербург') || c.includes('санкт') || c.includes('spb') || c.includes('спб'))
    return 'spb'
  if (c.includes('сочи')) return 'sochi'
  if (c.includes('казан')) return 'kazan'

  return city
}

// вспомогательно: все маршруты (на случай, если город не распознан)
const getAllRoutes = (): PopularRoute[] => {
  const arrays = Object.values(POPULAR_ROUTES)
  return arrays.flat()
}

// хелпер для склонения "день"
const declension = (one: string, few: string, many: string, value: number) => {
  const v = Math.abs(value) % 100
  const v1 = v % 10
  if (v > 10 && v < 20) return many
  if (v1 > 1 && v1 < 5) return few
  if (v1 === 1) return one
  return many
}

type SortMode = 'popularity' | 'days' | 'difficulty'
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard'

// как именно построить экран под кнопками
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

// локальная заглушка, если ничего нет
const TEST_IMAGE_URL = '/images/placeholder.jpg'

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
    const searchData = (await searchRes.json()) as [string, string[], string[], string[]]

    const foundTitle = searchData[1]?.[0]
    if (!foundTitle) return null

    const summaryUrl = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      foundTitle
    )}?origin=*`

    const summaryRes = await fetch(summaryUrl)
    if (!summaryRes.ok) return null

    const summaryData = await summaryRes.json()

    const extract: string | undefined =
      summaryData.extract || summaryData.description || summaryData?.content_urls?.desktop?.page

    if (!extract) return null

    const url: string | undefined =
      summaryData?.content_urls?.desktop?.page ||
      `https://ru.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`

    return {
      extract,
      url: url ?? `https://ru.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`,
    }
  } catch {
    return null
  }
}

// базовый URL бекенда
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://progid-backend.vercel.app'

// Тип "достопримечательность" в списке
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

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const { webApp } = useTelegramWebApp()

  const cityKey = normalizeCityKey(city)
  console.log(
    'PopularRoutesPage city=',
    city,
    'cityKey=',
    cityKey,
    'keys=',
    Object.keys(POPULAR_ROUTES)
  )

  let routes = POPULAR_ROUTES[cityKey] ?? POPULAR_ROUTES[city]
  if (!routes || routes.length === 0) {
    routes = getAllRoutes()
  }

  const cityTitle = routes[0]?.city ?? city

  const [activeRoute, setActiveRoute] = useState<PopularRoute | null>(null)

  const [sortMode, setSortMode] = useState<SortMode>('popularity')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all')

  const maxDaysAvailable = routes.length > 0 ? Math.max(...routes.map(r => r.daysCount)) : 1
  const [maxDaysFilter, setMaxDaysFilter] = useState<number>(maxDaysAvailable)

  const [mainImageIndex, setMainImageIndex] = useState<number>(0)
  const [routeImages, setRouteImages] = useState<string[]>([])

  const [activePoint, setActivePoint] = useState<ActivePointState | null>(null)
  const [pointImages, setPointImages] = useState<string[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)

  const [wikiInfo, setWikiInfo] = useState<WikiState>({
    loading: false,
    error: false,
    extract: null,
    url: null,
  })

  const [isWikiVisible, setIsWikiVisible] = useState<boolean>(false)

  // кэш фоток по точкам: ключ = routeId_pointIndex
  const [pointPhotosCache, setPointPhotosCache] = useState<Record<string, string[]>>({})

  // активная «вкладка» под кнопками
  const [viewMode, setViewMode] = useState<ViewMode>('places')

  // сброс всего при смене активного маршрута
  useEffect(() => {
    if (!activeRoute) {
      setMainImageIndex(0)
      setRouteImages([])
      setActivePoint(null)
      setPointImages([])
      setActiveImageIndex(0)
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null,
      })
      setIsWikiVisible(false)
    }
  }, [activeRoute])

  useEffect(() => {
    setMaxDaysFilter(maxDaysAvailable)
  }, [maxDaysAvailable])

  useEffect(() => {
    if (!webApp) return
    webApp.expand()
  }, [webApp])

  // маршруты с учётом фильтров — используются только во вкладке "Все маршруты"
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

  // ⚡ Список всех достопримечательностей края
  // Считаем по ВСЕМ маршрутам города, НЕ завязано на фильтры.
  const visiblePlaces = useMemo<PlaceItem[]>(() => {
    const list: PlaceItem[] = []
    const usedTitles = new Set<string>()

    for (const route of routes) {
      route.days.forEach((day, dayIdx) => {
        day.points.forEach((point, pointIdx) => {
          const keyTitle = (point.title || '').toLowerCase().trim()
          if (!keyTitle) return

          // режем дубляжи по названию
          if (usedTitles.has(keyTitle)) return
          usedTitles.add(keyTitle)

          list.push({
            id: `${route.id}_${dayIdx}_${pointIdx}`,
            route,
            dayTitle: day.title,
            pointIndex: pointIdx,
            point,
          })
        })
      })
    }

    return list
  }, [routes])

  const openPointModal = async (
    route: PopularRoute,
    dayTitle: string,
    point: { title: string; time?: string; description?: string; images?: string[] },
    index: number
  ) => {
    const cacheKey = `${route.id}_${index}`

    // запоминаем маршрут, чтобы можно было, например, отправить в бота
    setActiveRoute(route)

    // сразу открываем модалку
    setActivePoint({
      routeId: route.id,
      dayTitle,
      point,
    })
    setActiveImageIndex(0)

    // локальные картинки из маршрута
    const baseImages = Array.isArray(point.images) ? point.images : []

    // смотрим в кэш фоток по этой точке
    const cached = pointPhotosCache[cacheKey] ?? []

    if (cached.length > 0) {
      const merged = [...baseImages, ...cached]
      const uniq = Array.from(new Set(merged))
      setPointImages(uniq.length > 0 ? uniq : [TEST_IMAGE_URL])
    } else {
      // пока не знаем про облако — показываем только локальные (или заглушку)
      setPointImages(baseImages.length > 0 ? baseImages : [TEST_IMAGE_URL])
    }

    // если уже есть в кэше — парсер/бекенд больше не трогаем
    if (cached.length > 0) {
      setWikiInfo({
        loading: true,
        error: false,
        extract: null,
        url: null,
      })
      setIsWikiVisible(true)
      return
    }

    // ---- запрос к бекенду (только если в кэше пусто) ----
    const params = new URLSearchParams({
      routeId: route.id,
      pointIndex: String(index),
      city: route.city || cityTitle,
      title: point.title,
    })

    const fetchFromBackend = async (attempt: number) => {
      try {
        const url = `${API_BASE}/api/photos?${params.toString()}`
        console.log('PHOTO API URL =', url)

        const resp = await fetch(url)
        if (!resp.ok) {
          console.warn('photos api status:', resp.status)
          throw new Error('Bad status')
        }

        const data = await resp.json()
        console.log('photos result:', data)

        if (data.status === 'done' && Array.isArray(data.photos) && data.photos.length > 0) {
          const remotePhotos: string[] = data.photos

          // обновляем кэш
          setPointPhotosCache(prev => ({
            ...prev,
            [cacheKey]: remotePhotos,
          }))

          // объединяем локальные + удалённые
          setPointImages(prev => {
            const all = [...prev, ...remotePhotos]
            const uniq = Array.from(new Set(all))
            return uniq.length > 0 ? uniq : [TEST_IMAGE_URL]
          })
        } else if (data.status === 'pending') {
          if (attempt < 3) {
            setTimeout(() => fetchFromBackend(attempt + 1), 2000)
          } else {
            setPointImages(prev => (prev.length > 0 ? prev : [TEST_IMAGE_URL]))
          }
        } else {
          setPointImages(prev => (prev.length > 0 ? prev : [TEST_IMAGE_URL]))
        }
      } catch (e) {
        console.error('photos api error', e)
        setPointImages(prev => (prev.length > 0 ? prev : [TEST_IMAGE_URL]))
      }
    }

    fetchFromBackend(0)

    // --- Википедия ---
    setWikiInfo({
      loading: true,
      error: false,
      extract: null,
      url: null,
    })
    setIsWikiVisible(true)
  }

  const handleCreateCustomRoute = () => {
    if (!webApp) return

    const payload = {
      type: 'start_custom_route',
      city: cityTitle,
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert('Мы отправим данные в ProGid, когда вы будете использовать мини-приложение внутри Telegram.')
    }
  }

  const handleAiRoute = () => {
    if (!webApp) return

    const payload = {
      type: 'ai_route',
      city: cityTitle,
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
      pointTime: activePoint.point.time ?? null,
    }

    const data = JSON.stringify(payload)

    if (webApp?.sendData) {
      webApp.sendData(data)
    } else {
      alert('Мы отправили запрос боту. Просто прикрепите фото этого места в чат — мы добавим его к маршруту.')
    }
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

    const titleForWiki =
      activePoint.point.description && activePoint.point.description.length < 40
        ? activePoint.point.description
        : activePoint.point.title

    let isCancelled = false

    const loadWiki = async () => {
      const data = await fetchWikiExtract(titleForWiki)

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
  }, [activePoint])

  const handleSelectRoute = (route: PopularRoute) => {
    setActiveRoute(route)
    setMainImageIndex(0)

    const localImages: string[] = []
    if (route.coverImage) localImages.push(route.coverImage)
    if (Array.isArray(route.images) && route.images.length > 0) {
      localImages.push(...route.images)
    }

    const uniqLocal = Array.from(new Set(localImages))
    setRouteImages(uniqLocal.length > 0 ? uniqLocal : [TEST_IMAGE_URL])

    if (uniqLocal.length > 0) {
      setMainImageIndex(0)
    }
  }

  const hasRouteInfo =
    typeof activeRoute?.daysCount !== 'undefined' ||
    typeof activeRoute?.distanceKm !== 'undefined' ||
    typeof activeRoute?.estimatedBudget !== 'undefined' ||
    typeof activeRoute?.season !== 'undefined'

  const handleClosePointModal = () => {
    setActivePoint(null)
    setPointImages([])
    setActiveImageIndex(0)
    setWikiInfo({
      loading: false,
      error: false,
      extract: null,
      url: null,
    })
    setIsWikiVisible(false)
  }

  return (
    <div className="popular-routes-page">
      <div className="pr-header">
        <button className="pr-back-btn" type="button" onClick={onBack}>
          ← Назад
        </button>
        <div className="pr-header-main">
          <h2>Маршруты по городу</h2>
          <div className="pr-header-city">{cityTitle}</div>
        </div>
      </div>

      {/* ВЕРХНИЕ ТРИ КНОПКИ */}
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
          onClick={() => setViewMode('ai')}
        >
          Маршрут от ИИ
        </button>

        <button
          type="button"
          className={
            viewMode === 'routes' ? 'pr-all-routes-btn active' : 'pr-all-routes-btn'
          }
          onClick={() => setViewMode('routes')}
        >
          Все маршруты
        </button>
      </div>

      {/* ВКЛАДКА: ДОСТОПРИМЕЧАТЕЛЬНОСТИ */}
      {viewMode === 'places' && (
        <div className="places-section">
          <div className="section-title">Достопримечательности города и области</div>
          <div className="section-subtitle">
            Нажми на любую карточку, чтобы открыть фотографии и описание места.
          </div>

          <div className="routes-list">
            {visiblePlaces.map(place => (
              <button
                key={place.id}
                type="button"
                className="route-card"
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
                {place.point.description && (
                  <div className="route-desc">{place.point.description}</div>
                )}
              </button>
            ))}

            {visiblePlaces.length === 0 && (
              <div className="places-empty">Пока нет мест для этого города.</div>
            )}
          </div>
        </div>
      )}

      {/* ВКЛАДКА: МАРШРУТ ОТ ИИ */}
      {viewMode === 'ai' && (
        <div className="places-section">
          <div className="section-title">Маршрут от ИИ</div>
          <div className="section-subtitle">
            Мы зададим пару простых вопросов и подберём тебе идеальный маршрут по {cityTitle}.
          </div>

          <button type="button" className="pr-create-route-btn" onClick={handleAiRoute}>
            Подобрать маршрут
          </button>
        </div>
      )}

      {/* ВКЛАДКА: ВСЕ МАРШРУТЫ */}
      {viewMode === 'routes' && (
        <div className="routes-tab">
          <div className="section-title">Готовые маршруты</div>
          <div className="section-subtitle">
            Отфильтруй по сложности и количеству дней, потом выбери маршрут из списка.
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
                    sortMode === 'days' ? 'pr-segmented-btn active' : 'pr-segmented-btn'
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

          {/* Деталка маршрута */}
          {activeRoute && (
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
                        e.currentTarget.src = TEST_IMAGE_URL
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
                </div>
              )}

              {hasRouteInfo && (
                <div className="route-detail-meta">
                  {typeof activeRoute.distanceKm !== 'undefined' && (
                    <div>Протяжённость: ~{activeRoute.distanceKm} км</div>
                  )}
                  {typeof activeRoute.estimatedBudget !== 'undefined' && (
                    <div>Ориентировочный бюджет: от {activeRoute.estimatedBudget} ₽</div>
                  )}
                  {activeRoute.season && <div>Лучшее время: {activeRoute.season}</div>}
                </div>
              )}

              <div className="route-days-list">
                {activeRoute.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="route-day-block">
                    <div className="route-day-header">
                      <div className="route-day-title">{day.title}</div>
                      {day.description && (
                        <div className="route-day-description">{day.description}</div>
                      )}
                    </div>

                    <ul className="route-points-list">
                      {day.points.map((point, index) => (
                        <li key={index} className="route-point-li">
                          <button
                            type="button"
                            className="route-point-item"
                            onClick={() => openPointModal(activeRoute, day.title, point, index)}
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
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Список маршрутов */}
          <div className="routes-list-bottom">
            {visibleRoutes.map(route => (
              <button
                type="button"
                key={route.id}
                className={
                  activeRoute?.id === route.id
                    ? 'route-card route-card-active'
                    : 'route-card'
                }
                onClick={() => handleSelectRoute(route)}
              >
                <div className="route-card-header">
                  <div className="route-card-title">{route.title}</div>
                  <div className="route-days">
                    {route.daysCount} {declension('день', 'дня', 'дней', route.daysCount)}
                  </div>
                </div>
                <div className="route-desc">{route.shortDescription}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Модалка точки — общая для всех вкладок */}
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
                      e.currentTarget.src = TEST_IMAGE_URL
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
              </div>
            )}

            <button
              type="button"
              className="point-modal-add-photo-btn"
              onClick={handleAddPlacePhoto}
            >
              + Добавить фото этого места
            </button>

            {isWikiVisible && (
              <div className="point-modal-wiki">
                {wikiInfo.loading && <div>Загружаем описание…</div>}
                {wikiInfo.error && (
                  <div>
                    Не удалось загрузить описание с Википедии. Попробуйте позже или загляните на
                    карту.
                  </div>
                )}
                {!wikiInfo.loading && !wikiInfo.error && wikiInfo.extract && (
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
