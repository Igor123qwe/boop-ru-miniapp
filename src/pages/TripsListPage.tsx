// src/pages/TripsListPage.tsx
import React, { useEffect, useState } from 'react'
import type { TripTemplate } from '../types'
import { api } from '../api'
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

export const TripsListPage: React.FC<Props> = ({
  trips,
  onOpenTrip,
  onCreateTrip,
  onOpenPopular,
}) => {
  const [cityPhotos, setCityPhotos] = useState<Record<string, string | null>>({})

  // Загружаем обложки городов из облака
  useEffect(() => {
    let cancelled = false

    async function loadCovers() {
      for (const city of POPULAR_CITIES) {
        const slug = city.id                       // kaliningrad / moscow ...
        const cloudCity = CITY_MAP[slug]           // калининград / москва ...

        if (!cloudCity) continue

        // Берем фото дня 1 (обложку)
        const photos = await api.getCityDayPhotos(cloudCity, 1)
        const cover = photos[0] || null

        if (!cancelled) {
          setCityPhotos(prev => ({
            ...prev,
            [slug]: cover,
          }))
        }
      }
    }

    loadCovers()
    return () => {
      cancelled = true
    }
  }, [])

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
          const cover = cityPhotos[city.id] // URL или null

          return (
            <button
              key={city.id}
              type="button"
              className="city-card"
              onClick={() => onOpenPopular(city.id)}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={city.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
