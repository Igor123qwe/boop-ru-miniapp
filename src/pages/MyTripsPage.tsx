import React, { useEffect, useMemo, useState } from 'react'
import './MyTripsPage.css'

type RoutePoint = {
  title: string
  time?: string
  description?: string
  images?: string[]
}

type SavedTrip = {
  id: string
  city: string
  routeId: string
  title: string
  shortDescription?: string
  daysCount: number
  difficulty?: string
  distanceKm?: number
  estimatedBudget?: number
  season?: string
  coverImage?: string
  hiddenPoints: Record<number, number[]>
  extraPoints: Record<number, RoutePoint[]>
  routeSnapshot: {
    id: string
    city: string
    title: string
    shortDescription?: string
    daysCount: number
    difficulty?: string
    distanceKm?: number
    days: Array<{
      title: string
      description?: string
      points: RoutePoint[]
    }>
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

type Props = {
  onBack: () => void
  onOpenTrip?: (trip: SavedTrip) => void
}

const LOCAL_TRIPS_KEY = 'progid_my_trips'

const readSavedTrips = (): SavedTrip[] => {
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeSavedTrips = (items: SavedTrip[]) => {
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(items))
}

const declension = (
  one: string,
  few: string,
  many: string,
  value: number
): string => {
  const v = Math.abs(value) % 100
  const v1 = v % 10
  if (v > 10 && v < 20) return many
  if (v1 > 1 && v1 < 5) return few
  if (v1 === 1) return one
  return many
}

const difficultyLabel = (difficulty?: string): string => {
  if (difficulty === 'medium') return 'Средний'
  if (difficulty === 'hard') return 'Сложный'
  return 'Лёгкий'
}

const countVisiblePoints = (trip: SavedTrip): number => {
  let count = 0

  trip.routeSnapshot.days.forEach((day, dayIndex) => {
    const hidden = trip.hiddenPoints?.[dayIndex] ?? []
    day.points.forEach((_, pointIndex) => {
      if (!hidden.includes(pointIndex)) count += 1
    })

    const extra = trip.extraPoints?.[dayIndex] ?? []
    count += extra.length
  })

  return count
}

const formatDate = (iso?: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export const MyTripsPage: React.FC<Props> = ({ onBack, onOpenTrip }) => {
  const [trips, setTrips] = useState<SavedTrip[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    setTrips(readSavedTrips())
  }, [])

  const filteredTrips = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return trips

    return trips.filter(trip => {
      return (
        trip.title.toLowerCase().includes(q) ||
        trip.city.toLowerCase().includes(q) ||
        (trip.shortDescription || '').toLowerCase().includes(q)
      )
    })
  }, [trips, query])

  const handleDeleteTrip = (id: string) => {
    const next = trips.filter(t => t.id !== id)
    setTrips(next)
    writeSavedTrips(next)
  }

  return (
    <div className="my-trips-page">
      <div className="my-trips-header">
        <button className="my-trips-back-btn" type="button" onClick={onBack}>
          ← Назад
        </button>

        <div className="my-trips-header-main">
          <h2>Мои поездки</h2>
          <div className="my-trips-subtitle">
            Сохранённые маршруты и поездки
          </div>
        </div>
      </div>

      <div className="my-trips-topbar">
        <input
          type="text"
          className="my-trips-search"
          placeholder="Поиск по городу или названию маршрута…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        <div className="my-trips-counter">
          {filteredTrips.length} {declension('маршрут', 'маршрута', 'маршрутов', filteredTrips.length)}
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <div className="my-trips-empty">
          <div className="my-trips-empty-title">Пока ничего не сохранено</div>
          <div className="my-trips-empty-text">
            Открой любой маршрут и нажми «Отправить в мои поездки».
          </div>
        </div>
      ) : (
        <div className="my-trips-grid">
          {filteredTrips.map(trip => (
            <div key={trip.id} className="my-trip-card">
              {trip.coverImage ? (
                <img
                  src={trip.coverImage}
                  alt={trip.title}
                  className="my-trip-cover"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="my-trip-cover my-trip-cover-placeholder" />
              )}

              <div className="my-trip-body">
                <div className="my-trip-city">{trip.city}</div>
                <div className="my-trip-title">{trip.title}</div>

                {trip.shortDescription && (
                  <div className="my-trip-description">{trip.shortDescription}</div>
                )}

                <div className="my-trip-badges">
                  <span className="my-trip-badge">
                    {trip.daysCount} {declension('день', 'дня', 'дней', trip.daysCount)}
                  </span>
                  <span className="my-trip-badge">
                    {countVisiblePoints(trip)} точек
                  </span>
                  <span className="my-trip-badge">
                    {difficultyLabel(trip.difficulty)}
                  </span>
                  {typeof trip.distanceKm !== 'undefined' && (
                    <span className="my-trip-badge">~{trip.distanceKm} км</span>
                  )}
                </div>

                <div className="my-trip-footer">
                  <div className="my-trip-date">
                    Сохранён: {formatDate(trip.updatedAt || trip.createdAt)}
                  </div>

                  <div className="my-trip-actions">
                    {onOpenTrip && (
                      <button
                        type="button"
                        className="my-trip-open-btn"
                        onClick={() => onOpenTrip(trip)}
                      >
                        Открыть
                      </button>
                    )}

                    <button
                      type="button"
                      className="my-trip-delete-btn"
                      onClick={() => handleDeleteTrip(trip.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}