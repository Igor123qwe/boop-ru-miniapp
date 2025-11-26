import React, { useMemo } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import './PopularRoutesPage.css'

type Props = {
  city: string         // "Калининград", "Москва"...
  onBack: () => void
  onSelectRoute: (route: PopularRoute) => void  // ← добавили
}

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack, onSelectRoute }) => {
  const routes: PopularRoute[] = useMemo(
    () => POPULAR_ROUTES[city] ?? [],
    [city],
  )

  return (
    <div className="popular-routes-page">

      <button className="back-btn" onClick={onBack}>
        ← Назад
      </button>

      <h2 className="page-title">Готовые маршруты: {city}</h2>

      {routes.length === 0 && (
        <div className="empty-state">Пока нет готовых маршрутов для этого города.</div>
      )}

      <div className="routes-list">
        {routes.map(route => (
          <button
            key={route.id}
            className="route-card-btn"
            onClick={() => onSelectRoute(route)}   // ← теперь кликается
          >
            {route.title}
          </button>
        ))}
      </div>
    </div>
  )
}
