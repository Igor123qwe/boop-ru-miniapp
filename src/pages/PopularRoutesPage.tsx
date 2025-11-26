import React, { useMemo } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import './PopularRoutesPage.css'

type Props = {
  city: string      // "Калининград", "Москва" и т.д.
  onBack: () => void
}

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const routes: PopularRoute[] = useMemo(
    () => POPULAR_ROUTES[city] ?? [],
    [city],
  )

  return (
    <div className="popular-routes-page">
      <button
        type="button"
        className="back-btn"
        onClick={onBack}
      >
        ← Назад
      </button>

      <h2 className="page-title">Готовые маршруты: {city}</h2>

      {routes.length === 0 && (
        <div className="empty-state">
          Пока нет готовых маршрутов для этого города.
        </div>
      )}

      <div className="routes-list">
        {routes.map(route => (
          <div key={route.id} className="route-card">
            <div className="route-header">
              <h3>{route.title}</h3>
              {route.durationDays && (
                <span className="route-days">{route.durationDays} дней</span>
              )}
            </div>

            {route.description && (
              <p className="route-desc">{route.description}</p>
            )}

            {route.highlights && route.highlights.length > 0 && (
              <ul className="route-highlights">
                {route.highlights.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
