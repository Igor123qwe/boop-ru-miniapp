import React, { useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'

type Props = {
  city: string
  onBack: () => void
}

export const PopularRoutesPage: React.FC<Props> = ({ city, onBack }) => {
  const routes = POPULAR_ROUTES[city] ?? []

  // Локальное состояние: выбранный маршрут (для «второго шага»)
  const [activeRoute, setActiveRoute] = useState<PopularRoute | null>(null)

  // 👉 Если маршрут выбран — показываем экран деталей
  if (activeRoute) {
    return (
      <div style={{ padding: 16 }}>
        <button
          onClick={() => setActiveRoute(null)}
          style={{
            border: '1px solid #ddd',
            borderRadius: 999,
            padding: '6px 12px',
            background: '#fff',
            fontSize: 14,
            marginBottom: 16,
            cursor: 'pointer',
          }}
        >
          ← Назад к списку маршрутов
        </button>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: '0 0 8px',
          }}
        >
          {activeRoute.title}
        </h1>

        <p
          style={{
            margin: '0 0 12px',
            fontSize: 14,
            color: '#555',
          }}
        >
          Маршрут на {activeRoute.days}{' '}
          {activeRoute.days === 1
            ? 'день'
            : activeRoute.days >= 2 && activeRoute.days <= 4
            ? 'дня'
            : 'дней'}
          . {activeRoute.description}
        </p>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {activeRoute.points.map((point, index) => (
            <div
              key={index}
              style={{
                borderRadius: 12,
                padding: '10px 12px',
                background: '#fafafa',
                border: '1px solid #eee',
                fontSize: 14,
              }}
            >
              <div
                style={{
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                Точка {index + 1}
              </div>
              <div>{point}</div>
            </div>
          ))}
        </div>

        {/* На будущее — кнопка, чтобы потом «создавать поездку по этому маршруту» */}
        <button
          style={{
            marginTop: 20,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 999,
            border: 'none',
            background: '#000',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={() => {
            // тут позже можно будет сделать: создать поездку из шаблона
            // пока просто чуть «оживим» интерфейс
            alert('Скоро: создать поездку по этому маршруту ✈️')
          }}
        >
          Использовать этот маршрут
        </button>
      </div>
    )
  }

  // 👉 Базовый экран: список популярных маршрутов города
  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={onBack}
        style={{
          border: '1px solid #ddd',
          borderRadius: 999,
          padding: '6px 12px',
          background: '#fff',
          fontSize: 14,
          marginBottom: 16,
          cursor: 'pointer',
        }}
      >
        ← Назад
      </button>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '0 0 16px',
        }}
      >
        Маршруты: {city}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {routes.map(route => (
          <div
            key={route.id}
            onClick={() => setActiveRoute(route)}
            style={{
              borderRadius: 16,
              padding: '16px 16px 14px',
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {route.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#555',
              }}
            >
              {route.description}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#888',
              }}
            >
              {route.days} дн. • {route.points.length} ключевых точек
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
