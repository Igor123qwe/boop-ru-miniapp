import React from 'react'
import type { TripTemplate } from '../types'

interface TripCardProps {
  trip: TripTemplate
  onClick: () => void
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        background: '#fff',
        padding: 12,
        marginBottom: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{trip.title}</div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
        {trip.region} • {trip.daysCount} дней
      </div>
      {trip.budgetMin && (
        <div style={{ fontSize: 12, color: '#666' }}>
          Бюджет: от {trip.budgetMin} ₽
          {trip.budgetMax ? ` до ${trip.budgetMax} ₽` : ''}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 4 }}>{trip.descriptionShort}</div>
    </div>
  )
}
