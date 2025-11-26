// src/pages/PopularRoutesPage.tsx
import React, { useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes/index'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import './PopularRoutesPage.css'

type Props = {
  // сюда приходит id города из TripsListPage: "kaliningrad", "moscow" и т.п.
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

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const { webApp } = useTelegramWebApp()

  // маршруты для выбранного города из папки src/data/popularRoutes
  const routes = POPULAR_ROUTES[city] ?? []

  // название города по-русски берём из данных маршрута
  const cityTitle = routes[0]?.city ?? city

  const [activeRoute, setActiveRoute] = useState<PopularRoute | null>(null)

  const handleOpenMap = (route: PopularRoute) => {
    if (!route.yandexMapUrl) return

    if (webApp?.openLink) {
      webApp.openLink(route.yandexMapUrl)
    } else {
      window.open(route.yandexMapUrl, '_blank')
    }
  }

  // === режим просмотра деталей конкретного маршрута ===
  if (activeRoute) {
    const hasRouteInfo =
      typeof activeRoute.distanceKm !== 'undefined' ||
      typeof activeRoute.durationText !== 'undefined'

    return (
      <div className="popular-page">
        <button
          type="button"
          className="back-link"
          onClick={() => setActiveRoute(null)}
        >
          ← Назад к списку
        </button>

        <h2 className="page-title">{activeRoute.title}</h2>
        <p className="page-subtitle">{activeRoute.shortDescription}</p>

        {/* 🔹 Карта маршрута */}
        {activeRoute.yandexMapEmbedUrl && (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #eee',
              height: 220,
              background: '#f5f5f5',
            }}
          >
            <iframe
              src={activeRoute.yandexMapEmbedUrl}
              style={{ border: 0, width: '100%', height: '100%' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        {/* 🔹 Информация о маршруте (км + время) */}
        {hasRouteInfo && (
          <div
            style={{
              marginBottom: 12,
              fontSize: 13,
              color: '#444',
              padding: '8px 10px',
              borderRadius: 12,
              background: '#f7f7f7',
            }}
          >
            {typeof activeRoute.distanceKm !== 'undefined' && (
              <div>Протяжённость: ~{activeRoute.distanceKm} км</div>
            )}
            {activeRoute.durationText && (
              <div>В пути: {activeRoute.durationText}</div>
            )}
          </div>
        )}

        {/* 🔹 Кнопка "Открыть в Яндекс.Картах" */}
        <button
          type="button"
          onClick={() => handleOpenMap(activeRoute)}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            background: '#000',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 16,
            cursor: 'pointer',
          }}
        >
          Открыть маршрут в Яндекс.Картах
        </button>

        {activeRoute.days.map(day => (
          <div key={day.title} className="route-day">
            <div className="route-day-title">{day.title}</div>
            {day.description && (
              <p className="route-day-desc">{day.description}</p>
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
    )
  }

  // === режим списка готовых маршрутов по городу ===
  return (
    <div className="popular-page">
      <button type="button" className="back-link" onClick={onBack}>
        ← Назад
      </button>

      <h2 className="page-title">
        Готовые маршруты:
        <br />
        {cityTitle}
      </h2>

      {routes.length === 0 && (
        <p className="empty-text">
          Пока нет готовых маршрутов для этого города.
        </p>
      )}

      {routes.map(route => (
        <button
          key={route.id}
          type="button"
          className="route-card"
          onClick={() => setActiveRoute(route)} // ✅ берём данные из папки и открываем детали
        >
          <div className="route-card-title">{route.title}</div>
          <div className="route-card-subtitle">
            {route.daysCount}{' '}
            {declension('день', 'дня', 'дней', route.daysCount)}
          </div>
          <div className="route-card-desc">{route.shortDescription}</div>
        </button>
      ))}
    </div>
  )
}
