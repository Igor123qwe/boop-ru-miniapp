// src/pages/PopularRoutesPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import './PopularRoutesPage.css'

type Props = {
  city: string
  onBack: () => void
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

type ActivePointState = {
  routeId: string
  routeTitle: string
  dayTitle: string
  pointIndex: number
  point: PopularRoute['days'][number]['points'][number]
}

type WikiInfoState = {
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
    )}`
    const summaryRes = await fetch(summaryUrl)
    if (!summaryRes.ok) return null
    const summaryData = await summaryRes.json()

    const extract =
      (summaryData.extract as string | undefined) ??
      (summaryData.description as string | undefined) ??
      null
    const url = (summaryData.content_urls?.desktop?.page as string | undefined) ?? null

    if (!extract) return null

    return {
      extract,
      url: url ?? `https://ru.wikipedia.org/wiki/${encodeURIComponent(foundTitle)}`,
    }
  } catch {
    return null
  }
}

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const { webApp } = useTelegramWebApp()

  const routes = POPULAR_ROUTES[city] ?? []
  const cityTitle = routes[0]?.city ?? city

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
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [pointImages, setPointImages] = useState<string[]>([])

  const [wikiInfo, setWikiInfo] = useState<WikiInfoState>({
    loading: false,
    error: false,
    extract: null,
    url: null,
  })

  const handleOpenMap = (route: PopularRoute) => {
    if (!route.yandexMapUrl) return

    if (webApp?.openLink) {
      webApp.openLink(route.yandexMapUrl)
    } else {
      window.open(route.yandexMapUrl, '_blank')
    }
  }

  const handleAddPhoto = () => {
    if (!activeRoute || !activePoint) return

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
    }

    if (webApp?.showAlert) {
      webApp.showAlert(
        'Мы отправили запрос боту.\nПросто прикрепите фото этого места в чат — мы добавим его к маршруту.'
      )
    } else {
      alert(
        'Мы отправили запрос боту. Просто прикрепите фото этого места в чат — мы добавим его к маршруту.'
      )
    }
  }

  // фильтры
  const visibleRoutes = useMemo(() => {
    let result = [...routes]
    result = result.filter(r => r.daysCount <= maxDaysFilter)

    if (difficultyFilter !== 'all') {
      result = result.filter(
        r => (r.difficulty ?? 'easy') === difficultyFilter
      )
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

  // открыть точку и загрузить для неё фото (ленивый парсинг через backend)
  const openPointModal = async (
    route: PopularRoute,
    dayTitle: string,
    point: PopularRoute['days'][number]['points'][number],
    index: number
  ) => {
    const state: ActivePointState = {
      routeId: route.id,
      routeTitle: route.title,
      dayTitle,
      pointIndex: index,
      point,
    }

    setActivePoint(state)
    setActiveImageIndex(0)

    // 1. Сначала показываем локальные картинки из данных маршрута, если они есть
    const baseImages =
      point.images && point.images.length > 0 ? [...point.images] : []
    if (baseImages.length > 0) {
      setPointImages(baseImages)
    } else {
      setPointImages([])
    }

    // 2. Затем дергаем backend /api/photos — он:
    //   - если фото уже есть в хранилище → вернет status=done + массив URL
    //   - если фото ещё нет → запустит парсер и вернет status=pending
    const params = new URLSearchParams({
      routeId: route.id,
      pointIndex: String(index),
      city: route.city || cityTitle,
      title: point.title,
    })

    const fetchFromBackend = async (attempt: number) => {
      try {
        const resp = await fetch(`/api/photos?${params.toString()}`)
        const data = await resp.json()

        if (data.status === 'done' && Array.isArray(data.photos) && data.photos.length > 0) {
          // объединяем локальные фото и с бэкенда (убираем дубли)
          setPointImages(prev => {
            const all = [...prev, ...data.photos]
            const uniq = Array.from(new Set(all))
            return uniq.length > 0 ? uniq : [TEST_IMAGE_URL]
          })
        } else if (data.status === 'pending') {
          // парсинг ещё идёт — пробуем ещё раз через небольшую паузу
          if (attempt < 3) {
            setTimeout(() => {
              fetchFromBackend(attempt + 1)
            }, 1500)
          } else {
            // после нескольких попыток, если так и нет фото
            setPointImages(prev =>
              prev.length > 0 ? prev : [TEST_IMAGE_URL]
            )
          }
        } else {
          // неожиданный ответ
          setPointImages(prev =>
            prev.length > 0 ? prev : [TEST_IMAGE_URL]
          )
        }
      } catch (e) {
        console.error('Ошибка загрузки фото точки', e)
        setPointImages(prev =>
          prev.length > 0 ? prev : [TEST_IMAGE_URL]
        )
      }
    }

    fetchFromBackend(0)
  }

  const closePointModal = () => {
    setActivePoint(null)
    setActiveImageIndex(0)
    setPointImages([])
    setWikiInfo({
      loading: false,
      error: false,
      extract: null,
      url: null,
    })
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

  // Википедия
  useEffect(() => {
    if (!activePoint) return

    if (activePoint.point.description) {
      setWikiInfo({
        loading: false,
        error: false,
        extract: null,
        url: null,
      })
      return
    }

    const titleForWiki =
      activePoint.point.wikiTitle || activePoint.point.title

    let isCancelled = false

    const loadWiki = async () => {
      setWikiInfo({
        loading: true,
        error: false,
        extract: null,
        url: null,
      })

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

  // выбор маршрута — формируем картинки для верхнего блока из локальных данных
  const handleSelectRoute = async (route: PopularRoute) => {
    setActiveRoute(route)
    setMainImageIndex(0)

    const images: string[] = []

    if (route.coverImage) {
      images.push(route.coverImage)
    }

    route.days.forEach(day => {
      day.points.forEach(point => {
        if (point.images && point.images.length > 0) {
          images.push(point.images[0])
        }
      })
    })

    setRouteImages(images)
  }

  // === экран конкретного маршрута ===
  if (activeRoute) {
    const hasRouteInfo =
      typeof activeRoute.distanceKm !== 'undefined' ||
      typeof activeRoute.durationText !== 'undefined'

    const mainImages = routeImages
    const mainImagesCount = mainImages.length

    return (
      <div className="popular-routes-page">
        <button
          className="back-btn"
          type="button"
          onClick={() => {
            setActiveRoute(null)
            setRouteImages([])
          }}
        >
          ← Назад к списку
        </button>

        <h2 className="page-title">{activeRoute.title}</h2>
        <p className="route-desc">{activeRoute.shortDescription}</p>

        {mainImagesCount > 0 && (
          <div className="route-main-carousel">
            {mainImagesCount > 1 && (
              <button
                type="button"
                className="route-main-carousel-btn left"
                onClick={() => showPrevMainImage(mainImagesCount)}
              >
                ◀
              </button>
            )}
            <img
              src={mainImages[mainImageIndex % mainImagesCount]}
              alt={activeRoute.title}
              className="route-main-carousel-image"
              onError={e => {
                e.currentTarget.src = TEST_IMAGE_URL
              }}
            />
            {mainImagesCount > 1 && (
              <button
                type="button"
                className="route-main-carousel-btn right"
                onClick={() => showNextMainImage(mainImagesCount)}
              >
                ▶
              </button>
            )}
          </div>
        )}

        {hasRouteInfo && (
          <div className="route-detail-meta">
            {typeof activeRoute.distanceKm !== 'undefined' && (
              <div>Протяжённость: ~{activeRoute.distanceKm} км</div>
            )}
            {activeRoute.durationText && (
              <div>В пути: {activeRoute.durationText}</div>
            )}
          </div>
        )}

        <button
          type="button"
          className="route-open-map-btn"
          onClick={() => handleOpenMap(activeRoute)}
        >
          Открыть маршрут в Яндекс.Картах
        </button>

        <div className="route-days-list">
          {activeRoute.days.map(day => (
            <div key={day.title} className="route-day-block">
              <div className="route-day-title">{day.title}</div>
              {day.description && (
                <p className="route-day-text">{day.description}</p>
              )}

              <ul className="route-points">
                {day.points.map((point, index) => (
                  <li
                    key={index}
                    className="route-point route-point-clickable"
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
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {activeRoute.yandexMapEmbedUrl && (
          <div className="route-detail-map">
            <iframe
              src={activeRoute.yandexMapEmbedUrl}
              style={{ border: 0, width: '100%', height: '100%' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {activePoint && (
          <div className="route-point-modal-overlay" onClick={closePointModal}>
            <div
              className="route-point-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="route-point-modal-header">
                <div className="route-point-modal-text">
                  <div className="route-point-modal-day">
                    {activePoint.dayTitle}
                  </div>
                  <div className="route-point-modal-title">
                    {activePoint.point.title}
                  </div>
                  {activePoint.point.time && (
                    <div className="route-point-modal-time">
                      {activePoint.point.time}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="route-point-modal-close"
                  onClick={closePointModal}
                >
                  ✕
                </button>
              </div>

              {pointImages.length > 0 && (
                <div className="route-point-carousel">
                  {pointImages.length > 1 && (
                    <button
                      type="button"
                      className="route-point-carousel-btn left"
                      onClick={showPrevImage}
                    >
                      ◀
                    </button>
                  )}
                  <img
                    src={pointImages[activeImageIndex % pointImages.length]}
                    alt={activePoint.point.title}
                    className="route-point-carousel-image"
                    onError={e => {
                      e.currentTarget.src = TEST_IMAGE_URL
                    }}
                  />
                  {pointImages.length > 1 && (
                    <button
                      type="button"
                      className="route-point-carousel-btn right"
                      onClick={showNextImage}
                    >
                      ▶
                    </button>
                  )}
                </div>
              )}

              <div className="route-point-modal-description-block">
                {activePoint.point.description ? (
                  <p className="route-point-modal-description">
                    {activePoint.point.description}
                  </p>
                ) : wikiInfo.loading ? (
                  <p className="route-point-modal-description route-point-modal-description--muted">
                    Загружаем описание места…
                  </p>
                ) : wikiInfo.extract ? (
                  <p className="route-point-modal-description">
                    {wikiInfo.extract}
                  </p>
                ) : (
                  <p className="route-point-modal-description route-point-modal-description--muted">
                    Описание пока не добавлено.
                  </p>
                )}

                {wikiInfo.url && (
                  <a
                    href={wikiInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="route-point-modal-source"
                  >
                    Подробнее на Википедии
                  </a>
                )}
              </div>

              <button
                type="button"
                className="route-point-add-photo-btn"
                onClick={handleAddPhoto}
              >
                + Добавить фото
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // === список маршрутов ===
  return (
    <div className="popular-routes-page">
      <button className="back-btn" type="button" onClick={onBack}>
        ← Назад
      </button>

      <h2 className="page-title">Готовые маршруты: {cityTitle}</h2>

      {routes.length > 0 && (
        <div className="route-filters">
          <div className="route-filters-row">
            <label className="route-filter-label">
              Сортировка
              <select
                className="route-filter-select"
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
              >
                <option value="popularity">По популярности</option>
                <option value="days">По длительности</option>
                <option value="difficulty">По сложности</option>
              </select>
            </label>

            <label className="route-filter-label">
              Сложность
              <select
                className="route-filter-select"
                value={difficultyFilter}
                onChange={e =>
                  setDifficultyFilter(e.target.value as DifficultyFilter)
                }
              >
                <option value="all">Любая</option>
                <option value="easy">Лёгкий день</option>
                <option value="medium">Средний</option>
                <option value="hard">Насыщенный</option>
              </select>
            </label>
          </div>

          <div className="route-filters-row">
            <label className="route-filter-label route-filter-label--full">
              Длительность поездки
              <div className="route-slider-row">
                <input
                  type="range"
                  min={1}
                  max={maxDaysAvailable}
                  value={maxDaysFilter}
                  onChange={e => setMaxDaysFilter(Number(e.target.value))}
                  className="route-filter-range"
                />
                <span className="route-slider-value">
                  До {maxDaysFilter}{' '}
                  {declension('дня', 'дней', 'дней', maxDaysFilter)}
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {visibleRoutes.length === 0 && (
        <p className="empty-state">
          Нет маршрутов по выбранным параметрам. Попробуйте изменить фильтры.
        </p>
      )}

      <div className="routes-list">
        {visibleRoutes.map(route => (
          <button
            key={route.id}
            type="button"
            className="route-card-btn"
            onClick={() => handleSelectRoute(route)}
          >
            <div className="route-header">
              <h3>{route.title}</h3>
              <div className="route-days">
                {route.daysCount}{' '}
                {declension('день', 'дня', 'дней', route.daysCount)}
              </div>
            </div>
            <div className="route-desc">{route.shortDescription}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
