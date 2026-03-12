import React, { useState } from 'react'
import type { AppUser, TripTemplate } from './types'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { TripDetailPage } from './pages/TripDetailPage'
import { TripCreatePage } from './pages/TripCreatePage'
import { MyTripsPage } from './pages/MyTripsPage'
import { PopularRoutesPage } from './pages/PopularRoutesPage'
import './App.css'

type Page =
  | 'home'
  | 'feed'
  | 'tripDetail'
  | 'tripCreate'
  | 'myTrips'
  | 'popularRoutes'
  | 'profile'

const DEMO_USER: AppUser = {
  id: 'web-demo-user',
  telegramId: 0,
  firstName: 'Игорь',
  lastName: '',
  username: 'local-user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('Калининград')
  const [trips, setTrips] = useState<TripTemplate[]>([])

  const goToTripDetail = (tripId: string) => {
    setSelectedTripId(tripId)
    setCurrentPage('tripDetail')
  }

  const handleCreateTripClick = () => {
    setCurrentPage('tripCreate')
  }

  const handleTripCreated = (trip: TripTemplate) => {
    setTrips(prev => [trip, ...prev])
    setSelectedTripId(trip.id)
    setCurrentPage('tripDetail')
  }

  const handleOpenMyTrips = () => {
    setCurrentPage('myTrips')
  }

  const handleOpenPopularRoutes = (city: string) => {
    setSelectedCity(city)
    setCurrentPage('popularRoutes')
  }

  const handleOpenFeed = () => {
    setSelectedCity('Калининград')
    setCurrentPage('feed')
  }

  return (
    <>
      <Layout
        onGoToTripsList={() => setCurrentPage('home')}
        onGoToMyTrips={handleOpenMyTrips}
        onCreateTrip={handleCreateTripClick}
      >
        {currentPage === 'home' && (
          <HomePage
            onOpenCity={handleOpenPopularRoutes}
            onOpenFeed={handleOpenFeed}
          />
        )}

        {currentPage === 'feed' && (
          <PopularRoutesPage
            city={selectedCity}
            onBack={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'popularRoutes' && (
          <PopularRoutesPage
            city={selectedCity}
            onBack={() => setCurrentPage('home')}
          />
        )}

        {currentPage === 'tripDetail' && selectedTripId && (
          <TripDetailPage
            tripId={selectedTripId}
            appUser={DEMO_USER}
            onCopySuccess={() => setCurrentPage('myTrips')}
          />
        )}

        {currentPage === 'tripCreate' && (
          <TripCreatePage author={DEMO_USER} onCreated={handleTripCreated} />
        )}

        {currentPage === 'myTrips' && (
          <MyTripsPage onBack={() => setCurrentPage('home')} />
        )}

        {currentPage === 'profile' && <ProfilePage />}
      </Layout>

      <nav className="web-bottom-nav">
        <button
          type="button"
          className={currentPage === 'home' ? 'active' : ''}
          onClick={() => setCurrentPage('home')}
        >
          <span>🏠</span>
          <span>Главная</span>
        </button>

        <button
          type="button"
          className={currentPage === 'feed' ? 'active' : ''}
          onClick={handleOpenFeed}
        >
          <span>🌍</span>
          <span>Лента</span>
        </button>

        <button
          type="button"
          className={currentPage === 'popularRoutes' ? 'active' : ''}
          onClick={() => {
            setSelectedCity('Калининград')
            setCurrentPage('popularRoutes')
          }}
        >
          <span>🗺</span>
          <span>Маршруты</span>
        </button>

        <button
          type="button"
          className={currentPage === 'myTrips' ? 'active' : ''}
          onClick={() => setCurrentPage('myTrips')}
        >
          <span>💾</span>
          <span>Поездки</span>
        </button>

        <button
          type="button"
          className={currentPage === 'profile' ? 'active' : ''}
          onClick={() => setCurrentPage('profile')}
        >
          <span>👤</span>
          <span>Профиль</span>
        </button>
      </nav>
    </>
  )
}