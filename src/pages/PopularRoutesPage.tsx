// src/pages/PopularRoutesPage.tsx
import React, { useMemo, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import './PopularRoutesPage.css'

type Props = {
  city: string // "Калининград", "Москва" и т.п. — ключ из POPULAR_ROUTES
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

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const { webApp } = useTelegramWebApp()

  const routes = POPULAR_ROUTES[city] ?? []
  const cityTitle = routes[0]?.city ?? city

  const [activeRoute, setActiveRoute] = useState<PopularRoute | null>(null)

  // фильтры / сортировка
  const [sortMode, setSortMode] = useState<SortMode>('popularity')
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>('all')

  const maxDaysAvailable =
    routes.length > 0 ? Math.max(...routes.map(r => r.daysCount)) : 1
  const [maxDaysFilter, setMaxDaysFilter] = useState<number>(maxDaysAvailable)

  const handleOpenMap = (route: PopularRoute) => {
    if (!route.yandexMapUrl) return

    if (webApp?.openLink) {
      webApp.openLink(route.yandexMapUrl)
    } else {
      window.open(route.yandexMapUrl, '_blank')
    }
  }

  // применяем фильтры и сортировку
  const visibleRoutes = useMemo(() => {
    let result = [...routes]

    // по количеству дней
    result = result.filter(r => r.daysCount <= maxDaysFilter)

    // по сложности
    if (difficultyFilter !== 'all') {
      result = result.filter(
        r => (r.difficulty ?? 'easy') === difficultyFilter
      )
    }

    // сортировка
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
      // popularity
      const pa = a.popularity ?? 0
      const pb = b.popularity ?? 0
      return pb - pa
    })

    return result
  }, [routes, sortMode, difficultyFilter, maxDaysFilter])

  // === экран конкретного маршрута ===
  if (activeRoute) {
    const hasRouteInfo =
      typeof activeRoute.distanceKm !== 'undefined' ||
      typeof activeRoute.durationText !== 'undefined'

    return (
      <div className="popular-routes-page">
        <button className="back-btn" type="button" onClick={() => setActiveRoute(null)}>
          ← Назад к списку
        </button>

        <h2 className="page-title">{activeRoute.title}</h2>
        <p className="route-desc">{activeRoute.shortDescription}</p>

        {/* карта */}
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

        {/* инфо: км + время */}
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

        {/* план по дням */}
        <div className="route-days-list">
          {activeRoute.days.map(day => (
            <div key={day.title} className="route-day-block">
              <div className="route-day-title">{day.title}</div>
              {day.description && (
                <p className="route-day-text">{day.description}</p>
              )}

              <ul className="route-points">
                {day.points.map((point, index) => (
                  <li key={index} className="route-point">
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

      {/* панель фильтров / "как в отелях" */}
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
            onClick={() => setActiveRoute(route)}
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
