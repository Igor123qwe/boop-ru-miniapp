import React from 'react'
import type { TripTemplate } from '../types'
import { TripCard } from '../components/TripCard'

interface TripsListPageProps {
  trips: TripTemplate[]
  onOpenTrip: (id: string) => void
  onCreateTrip: () => void
}

export const TripsListPage: React.FC<TripsListPageProps> = ({
  trips,
  onOpenTrip,
  onCreateTrip,
}) => {
  // простые стили, чтобы ничего отдельно не подключать
  const styles = {
    container: {
      padding: 16,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    } as React.CSSProperties,
    createCard: {
      background: '#fff',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
      cursor: 'pointer',
    } as React.CSSProperties,
    createTitle: {
      margin: '0 0 8px 0',
      fontSize: 20,
      fontWeight: 600,
    } as React.CSSProperties,
    createText: {
      margin: 0,
      fontSize: 14,
      opacity: 0.8,
    } as React.CSSProperties,
    createButton: {
      marginTop: 12,
      background: '#000',
      color: '#fff',
      padding: '10px 16px',
      borderRadius: 12,
      cursor: 'pointer',
      border: 'none',
      fontSize: 15,
    } as React.CSSProperties,
    sectionTitle: {
      margin: '24px 0 12px',
      fontSize: 18,
      fontWeight: 600,
    } as React.CSSProperties,
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
    } as React.CSSProperties,
    cityCard: {
      position: 'relative',
      borderRadius: 14,
      overflow: 'hidden',
      height: 120,
      background: '#ddd',
    } as React.CSSProperties,
    cityImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    } as React.CSSProperties,
    cityName: {
      position: 'absolute',
      bottom: 6,
      left: 8,
      color: '#fff',
      textShadow: '0 0 6px black',
      fontWeight: 600,
      fontSize: 14,
    } as React.CSSProperties,
    userTripWrapper: {
      marginTop: 8,
    } as React.CSSProperties,
  }

  const popularCities = [
    { title: 'Калининград', img: 'https://source.unsplash.com/random/400x300/?kaliningrad' },
    { title: 'Москва', img: 'https://source.unsplash.com/random/400x300/?moscow' },
    { title: 'Санкт-Петербург', img: 'https://source.unsplash.com/random/400x300/?saint-petersburg' },
    { title: 'Сочи', img: 'https://source.unsplash.com/random/400x300/?sochi' },
    { title: 'Казань', img: 'https://source.unsplash.com/random/400x300/?kazan' },
  ]

  return (
    <div style={styles.container}>
      {/* Большая карточка как у Boop — CTA "Создать маршрут" */}
      <div style={styles.createCard} onClick={onCreateTrip}>
        <h3 style={styles.createTitle}>Создать маршрут</h3>
        <p style={styles.createText}>
          Ответь на несколько вопросов, и мы соберём план поездки под тебя.
        </p>
        <button
          style={styles.createButton}
          onClick={e => {
            e.stopPropagation()
            onCreateTrip()
          }}
        >
          Начать
        </button>
      </div>

      {/* Популярные направления */}
      <h2 style={styles.sectionTitle}>Популярные направления</h2>
      <div style={styles.grid}>
        {popularCities.map(city => (
          <div key={city.title} style={styles.cityCard}>
            <img src={city.img} alt={city.title} style={styles.cityImage} />
            <div style={styles.cityName}>{city.title}</div>
          </div>
        ))}
      </div>

      {/* Реальные маршруты от людей (когда появятся) */}
      {trips.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Маршруты от людей</h2>
          <div style={styles.userTripWrapper}>
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => onOpenTrip(trip.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Если маршрутов пока нет — можно позже добавить текст-заглушку,
          но главный акцент теперь на "Создать маршрут" и популярных городах */}
    </div>
  )
}
