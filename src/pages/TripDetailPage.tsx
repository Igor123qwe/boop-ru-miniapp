import React, { useEffect, useState } from 'react'
import type { AppUser, TripDay, TripTemplate } from '../types'
import { api } from '../api'

interface TripDetailPageProps {
  tripId: string
  appUser: AppUser | null
  onCopySuccess: () => void
}

export const TripDetailPage: React.FC<TripDetailPageProps> = ({
  tripId,
  appUser,
  onCopySuccess,
}) => {
  const [trip, setTrip] = useState<TripTemplate | null>(null)
  const [days, setDays] = useState<TripDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCopying, setIsCopying] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { trip, days } = await api.getTripById(tripId)
        setTrip(trip)
        setDays(days)
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [tripId])

  const handleCopy = async () => {
    if (!appUser || !trip) return
    setIsCopying(true)
    try {
      await api.copyTripForUser(trip.id, appUser.id)
      onCopySuccess()
    } finally {
      setIsCopying(false)
    }
  }

  if (isLoading || !trip) {
    return <div>Загрузка маршрута…</div>
  }

  return (
    <div>
      <h3>{trip.title}</h3>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
        {trip.region} • {trip.daysCount} дней
      </div>
      {trip.budgetMin && (
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          Бюджет: {trip.budgetMin}–{trip.budgetMax ?? '...'} ₽ на человека
        </div>
      )}
      <p style={{ fontSize: 13, marginBottom: 8 }}>{trip.descriptionShort}</p>

      <button
        onClick={handleCopy}
        disabled={isCopying}
        style={{
          marginBottom: 16,
          width: '100%',
          borderRadius: 12,
          border: 'none',
          background: '#000',
          color: '#fff',
          padding: '10px 16px',
          fontSize: 14,
        }}
      >
        {isCopying ? 'Копируем…' : 'Скопировать маршрут'}
      </button>

      <h4 style={{ marginBottom: 8 }}>Программа по дням</h4>
      {days.map(day => (
        <div
          key={day.id}
          style={{
            borderRadius: 8,
            background: '#fff',
            padding: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            День {day.dayNumber}
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>{day.summary}</div>
          <ul style={{ fontSize: 13, paddingLeft: 16 }}>
            {day.activities.map((act, idx) => (
              <li key={idx}>
                {act.timeApprox && <strong>{act.timeApprox}: </strong>}
                {act.title}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
