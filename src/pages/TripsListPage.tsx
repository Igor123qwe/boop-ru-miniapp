// src/pages/TripsListPage.tsx
import React from 'react'
import type { TripTemplate } from '../types'
import './TripsListPage.css'

type Props = {
  trips: TripTemplate[]
  onOpenTrip: (tripId: string) => void
  onCreateTrip: () => void
  onOpenPopular: (city: string) => void // slug города
}

// Города, которые показываем на главной
const POPULAR_CITIES = [
  { id: 'kaliningrad', name: 'Калининград' },
  { id: 'moscow', name: 'Москва' },
  { id: 'spb', name: 'Санкт-Петербург' },
  { id: 'sochi', name: 'Сочи' },
  { id: 'kazan', name: 'Казань' },
]

// Соответствие slug → папка в облаке (кириллица)
const CITY_MAP: Record<string, string> = {
  kaliningrad: 'калининград',
  moscow: 'москва',
  spb: 'санкт-петербург',
  sochi: 'сочи',
  kazan: 'казань',
}

// Базовый URL для облака
const CLOUD_BASE_URL =
  (import.meta.env.VITE_CLOUD_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://storage.yandexcloud.net/progid-images'

// Получить URL обложки города (city-cover.jpg в корне папки города)
const getCityCoverUrl = (slug: string): string | null => {
  const folder = CITY_MAP[slug]
  if (!folder) return null

  return `${CLOUD_BASE_URL}/${encodeURIComponent(folder)}/city-cover.jpg`
}

export const TripsListPage: React.FC<Props> = ({
  trips,
  onOpenTrip,
  onCreateTrip,
  onOpenPopular,
}) => {
  return (
    <div className="home-page">
      {/* Блок "Создать маршрут" */}
      <div className="create-trip" onClick={onCreateTrip}>
        <div className="card-content">
          <h3>Создать маршрут</h3>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>
            Ответь на несколько вопросов, и мы соберём план поездки под тебя.
          </p>
          <button className="btn-primary" type="button">
            Начать
          </button>
        </div>
      </div>

      {/* Популярные направления */}
      <div className="section-title">Популярные направления</div>
      <div className="cards-grid">
        {POPULAR_CITIES.map(city => {
          const cover = getCityCoverUrl(city.id)

          return (
            <button
              key={city.id}
              type="button"
              className="city-card"
              onClick={() => onOpenPopular(city.id)} // передаём slug
            >
              {cover ? (
                <img
                  src={cover}
                  alt={city.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    // если обложка не загрузилась — показываем серый фон
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.style.background = '#ddd'
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#ddd',
                  }}
                />
              )}
              <span className="city-name">{city.name}</span>
            </button>
          )
        })}
      </div>

      {/* Мои маршруты */}
      {trips.length > 0 && (
        <>
          <div className="section-title">Мои поездки</div>
          {trips.map(trip => (
            <div
              key={trip.id}
              className="user-trip-card"
              onClick={() => onOpenTrip(trip.id)}
            >
              <div className="trip-title">
                {trip.title ?? trip.name ?? 'Маршрут'}
              </div>
              <div className="trip-desc">
                {trip.description ?? trip.city ?? 'Сохранённый маршрут'}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
