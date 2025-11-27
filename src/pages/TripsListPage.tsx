// src/pages/TripsListPage.tsx
import React from 'react'
import type { TripTemplate } from '../types'
import './TripsListPage.css'

type Props = {
  trips: TripTemplate[]
  onOpenTrip: (tripId: string) => void
  onCreateTrip: () => void
  onOpenPopular: (city: string) => void // сюда прилетает slug города
}

// какие города показываем на главном экране
const POPULAR_CITIES = [
  { id: 'kaliningrad', name: 'Калининград', image: '/images/kaliningrad.jpg' },
  { id: 'moscow', name: 'Москва', image: '/images/moscow.jpg' },
  { id: 'spb', name: 'Санкт-Петербург', image: '/images/spb.jpg' },
  { id: 'sochi', name: 'Сочи', image: '/images/sochi.jpg' },
  { id: 'kazan', name: 'Казань', image: '/images/kazan.jpg' },
]

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
        {POPULAR_CITIES.map(city => (
          <button
            key={city.id}
            type="button"
            className="city-card"
            onClick={() => onOpenPopular(city.id)} // slug, НЕ русское имя
          >
            {city.image && <img src={city.image} alt={city.name} />}
            <span className="city-name">{city.name}</span>
          </button>
        ))}
      </div>

      {/* Мои маршруты (если они есть) */}
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
