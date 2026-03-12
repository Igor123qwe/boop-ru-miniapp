// src/App.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useTelegramWebApp } from './hooks/useTelegramWebApp'
import { api } from './api'
import type { AppUser, TripTemplate } from './types'
import { Layout } from './components/Layout'
import { OnboardingPage } from './pages/OnboardingPage'
import { TripsListPage } from './pages/TripsListPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { TripCreatePage } from './pages/TripCreatePage'
import { MyTripsPage } from './pages/MyTripsPage'
import { PopularRoutesPage } from './pages/PopularRoutesPage'

// все экраны приложения
type Page =
  | 'onboarding'
  | 'tripsList'
  | 'tripDetail'
  | 'tripCreate'
  | 'myTrips'
  | 'popularRoutes'

const DEMO_USER: AppUser = {
  id: 'local-demo-user',
  telegramId: 0,
  firstName: 'Гость',
  lastName: '',
  username: 'guest',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const App: React.FC = () => {
  const { tgUser, isReady } = useTelegramWebApp()

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('onboarding')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveUser = useMemo<AppUser>(() => {
    return appUser ?? DEMO_USER
  }, [appUser])

  // ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
  useEffect(() => {
    if (!isReady) return

    // если приложение открыто НЕ из Telegram —
    // даём открыть обычный интерфейс в браузере
    if (!tgUser) {
      setAppUser(null)
      setTrips([])
      setError(null)
      setCurrentPage('tripsList')
      return
    }

    const init = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const user = await api.getOrCreateUserFromTelegram(tgUser.id)
        setAppUser(user)

        const list = await api.listTrips()
        setTrips(list)

        setCurrentPage('tripsList')
      } catch (e) {
        console.error(e)
        setError('Не удалось загрузить данные. Попробуйте ещё раз.')
        setCurrentPage('tripsList')
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [isReady, tgUser])

  // ===== ХЕНДЛЕРЫ НАВИГАЦИИ =====
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

  if (!isReady) {
    return (
      <div
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        Загрузка приложения…
      </div>
    )
  }

  return (
    <Layout
      onGoToTripsList={() => setCurrentPage('tripsList')}
      onGoToMyTrips={handleOpenMyTrips}
      onCreateTrip={handleCreateTripClick}
    >
      {error && (
        <div
          style={{
            margin: '8px 16px',
            padding: '8px 12px',
            borderRadius: 12,
            backgroundColor: 'rgba(255,0,0,0.06)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {isLoading && currentPage === 'tripsList' && trips.length === 0 && (
        <div style={{ padding: 16 }}>Загружаем маршруты…</div>
      )}

      {currentPage === 'onboarding' && (
        <OnboardingPage
          tgUser={tgUser}
          onContinue={() => setCurrentPage('tripsList')}
        />
      )}

      {currentPage === 'tripsList' && (
        <TripsListPage
          trips={trips}
          onOpenTrip={goToTripDetail}
          onCreateTrip={handleCreateTripClick}
          onOpenPopular={handleOpenPopularRoutes}
        />
      )}

      {currentPage === 'popularRoutes' && selectedCity && (
        <PopularRoutesPage
          city={selectedCity}
          onBack={() => setCurrentPage('tripsList')}
        />
      )}

      {currentPage === 'tripDetail' && selectedTripId && (
        <TripDetailPage
          tripId={selectedTripId}
          appUser={effectiveUser}
          onCopySuccess={() => setCurrentPage('myTrips')}
        />
      )}

      {currentPage === 'tripCreate' && (
        <TripCreatePage
          author={effectiveUser}
          onCreated={handleTripCreated}
        />
      )}

      {currentPage === 'myTrips' && (
        <MyTripsPage
          onBack={() => setCurrentPage('tripsList')}
        />
      )}
    </Layout>
  )
}