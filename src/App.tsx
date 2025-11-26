import React, { useEffect, useState } from 'react'
import { useTelegramWebApp } from './hooks/useTelegramWebApp'
import { api } from './api'
import type { AppUser, TripTemplate } from './types'
import { Layout } from './components/Layout'
import { OnboardingPage } from './pages/OnboardingPage'
import { TripsListPage } from './pages/TripsListPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { TripCreatePage } from './pages/TripCreatePage'
import { MyTripsPage } from './pages/MyTripsPage'
import { PopularRoutesPage } from './pages/PopularRoutesPage' // 🔹 новая страница

type Page =
  | 'onboarding'
  | 'tripsList'
  | 'tripDetail'
  | 'tripCreate'
  | 'myTrips'
  | 'popularRoutes' // 🔹 добавили

export const App: React.FC = () => {
  const { tgUser, isReady } = useTelegramWebApp()

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('onboarding')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null) // 🔹 город для популярных маршрутов
  const [trips, setTrips] = useState<TripTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Инициализация приложения после готовности WebApp
  useEffect(() => {
    if (!isReady) return

    // Если открыли не из Telegram — просто показываем онбординг
    if (!tgUser) {
      setAppUser(null)
      setTrips([])
      setCurrentPage('onboarding')
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
        setCurrentPage('onboarding')
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [isReady, tgUser])

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

  // 🔹 открытие списка популярных маршрутов по городу
  const handleOpenPopularRoutes = (city: string) => {
    setSelectedCity(city)
    setCurrentPage('popularRoutes')
  }

  // Пока Telegram WebApp не готов — показываем простой лоадер
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
          // Можно сразу вести в создание маршрута
          onContinue={handleCreateTripClick}
        />
      )}

      {currentPage === 'tripsList' && (
        <TripsListPage
          trips={trips}
          onOpenTrip={goToTripDetail}
          onCreateTrip={handleCreateTripClick}
          onOpenPopular={handleOpenPopularRoutes} // 🔹 новый проп
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
          appUser={appUser}
          onCopySuccess={() => setCurrentPage('myTrips')}
        />
      )}

      {currentPage === 'tripCreate' && appUser && (
        <TripCreatePage author={appUser} onCreated={handleTripCreated} />
      )}

      {currentPage === 'myTrips' && appUser && (
        <MyTripsPage appUser={appUser} />
      )}
    </Layout>
  )
}
