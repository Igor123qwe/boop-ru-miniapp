import React, { useState } from 'react'
import type { AppUser, TripTemplate } from './types'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { FeedPage } from './pages/FeedPage'
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
  // Главной страницей делаем именно ленту
  const [currentPage, setCurrentPage] = useState<Page>('feed')

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('Калининград')
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined)
  const [routesBackPage, setRoutesBackPage] = useState<Page>('feed')

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

  const handleOpenPopularRoutes = (city: string, routeId?: string) => {
    setSelectedCity(city)
    setSelectedRouteId(routeId)
    setRoutesBackPage(currentPage)
    setCurrentPage('popularRoutes')
  }

  const handleBackFromPopularRoutes = () => {
    setSelectedRouteId(undefined)
    setCurrentPage(routesBackPage)
  }

  return (
    <>
      <Layout
        onGoToTripsList={() => setCurrentPage('feed')}
        onGoToMyTrips={handleOpenMyTrips}
        onCreateTrip={handleCreateTripClick}
      >
        {currentPage === 'home' && (
          <HomePage
            onOpenCity={(city) => handleOpenPopularRoutes(city)}
            onOpenFeed={() => setCurrentPage('feed')}
          />
        )}

        {currentPage === 'feed' && (
          <FeedPage onOpenRoutes={handleOpenPopularRoutes} />
        )}

        {currentPage === 'popularRoutes' && (
          <PopularRoutesPage
            city={selectedCity}
            initialRouteId={selectedRouteId}
            onBack={handleBackFromPopularRoutes}
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
          <TripCreatePage
            author={DEMO_USER}
            onCreated={handleTripCreated}
          />
        )}

        {currentPage === 'myTrips' && (
          <MyTripsPage onBack={() => setCurrentPage('feed')} />
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
          onClick={() => setCurrentPage('feed')}
        >
          <span>🌍</span>
          <span>Лента</span>
        </button>

        <button
          type="button"
          className={currentPage === 'popularRoutes' ? 'active' : ''}
          onClick={() => {
            setSelectedCity('Калининград')
            setSelectedRouteId(undefined)
            setRoutesBackPage(currentPage)
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