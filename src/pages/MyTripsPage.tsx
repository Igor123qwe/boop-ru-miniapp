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

export const MyTripsPage: React.FC<Props> = ({ onBack }) => {
  const [trips, setTrips] = useState<SavedTrip[]>([])
  const [query, setQuery] = useState('')
  const [selectedTrip, setSelectedTrip] = useState<SavedTrip | null>(null)

  const reloadTrips = () => {
    setTrips(readSavedTrips())
  }

  useEffect(() => {
    reloadTrips()

    const onStorage = () => reloadTrips()
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
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

    if (selectedTrip?.id === id) {
      setSelectedTrip(null)
    }
  }

  if (selectedTrip) {
    return (
      <div className="my-trips-page">
        <div className="my-trips-header">
          <button
            className="my-trips-back-btn"
            type="button"
            onClick={() => setSelectedTrip(null)}
          >
            ← К списку поездок
          </button>

          <div className="my-trips-header-main">
            <h2>{selectedTrip.title}</h2>
            <div className="my-trips-subtitle">{selectedTrip.city}</div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 22,
            padding: 16,
            boxShadow: '0 12px 28px rgba(15,23,42,0.08)'
          }}
        >
          {selectedTrip.coverImage && (
            <img
              src={selectedTrip.coverImage}
              alt={selectedTrip.title}
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 18,
                marginBottom: 16,
                display: 'block'
              }}
            />
          )}

          {selectedTrip.shortDescription && (
            <div style={{ marginBottom: 16, color: '#475569', lineHeight: 1.5 }}>
              {selectedTrip.shortDescription}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 18
            }}
          >
            <span className="my-trip-badge">
              {selectedTrip.daysCount}{' '}
              {declension('день', 'дня', 'дней', selectedTrip.daysCount)}
            </span>
            <span className="my-trip-badge">
              {countVisiblePoints(selectedTrip)} точек
            </span>
            <span className="my-trip-badge">
              {difficultyLabel(selectedTrip.difficulty)}
            </span>
            {typeof selectedTrip.distanceKm !== 'undefined' && (
              <span className="my-trip-badge">~{selectedTrip.distanceKm} км</span>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {selectedTrip.routeSnapshot.days.map((day, dayIndex) => {
              const hidden = selectedTrip.hiddenPoints?.[dayIndex] ?? []
              const extra = selectedTrip.extraPoints?.[dayIndex] ?? []

              return (
                <div
                  key={dayIndex}
                  style={{
                    border: '1px solid rgba(15,23,42,0.08)',
                    borderRadius: 18,
                    padding: 14,
                    background: '#fff'
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: '#0f172a',
                      marginBottom: 6
                    }}
                  >
                    {day.title}
                  </div>

                  {day.description && (
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                      {day.description}
                    </div>
                  )}

                  <div style={{ display: 'grid', gap: 8 }}>
                    {day.points.map((point, pointIndex) => {
                      if (hidden.includes(pointIndex)) return null

                      return (
                        <div
                          key={pointIndex}
                          style={{
                            border: '1px solid rgba(15,23,42,0.06)',
                            borderRadius: 14,
                            padding: 10,
                            background: '#f8fafc'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {point.time ? `${point.time} — ` : ''}
                            {point.title}
                          </div>
                          {point.description && (
                            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
                              {point.description}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {extra.map((point, extraIndex) => (
                      <div
                        key={`extra-${extraIndex}`}
                        style={{
                          border: '1px dashed rgba(16,185,129,0.45)',
                          borderRadius: 14,
                          padding: 10,
                          background: '#f0fdf4'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {point.time ? `${point.time} — ` : ''}
                          {point.title}
                        </div>
                        {point.description && (
                          <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
                            {point.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
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
          {filteredTrips.length}{' '}
          {declension('маршрут', 'маршрута', 'маршрутов', filteredTrips.length)}
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
                    {trip.daysCount}{' '}
                    {declension('день', 'дня', 'дней', trip.daysCount)}
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
                    <button
                      type="button"
                      className="my-trip-open-btn"
                      onClick={() => setSelectedTrip(trip)}
                    >
                      Открыть
                    </button>

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