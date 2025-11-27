// src/App.tsx
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
import { PopularRoutesPage } from './pages/PopularRoutesPage'

// все экраны приложения
type Page =
  | 'onboarding'
  | 'tripsList'
  | 'tripDetail'
  | 'tripCreate'
  | 'myTrips'
  | 'popularRoutes'

export const App: React.FC = () => {
  const { tgUser, isReady } = useTelegramWebApp()

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('onboarding')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
  useEffect(() => {
    if (!isReady) return

    // если не из Telegram — оставляем только онбординг
    f (!tgUser) {
  console.log("DEMO MODE: Webapp user not found, running standalone.");
  setAppUser(null)
  setTrips([])  
  setCurrentPage('tripsList')  // ⬅️ САМЫЙ ВАЖНЫЙ МОМЕНТ
  return

    const init = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const user = await api.getOrCreateUserFromTelegram(tgUser.id)
        setAppUser(user)

        const list = await api.listTrips()
        setTrips(list)

        // после загрузки из Telegram сразу показываем список
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

  // === ХЕНДЛЕРЫ НАВИГАЦИИ ===
  const goToTripsList = () => {
    setCurrentPage('tripsList')
    setSelectedTripId(null)
    setSelectedCity(null)
  }

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

  // открыть список популярных маршрутов по выбранному городу
  const handleOpenPopularRoutes = (citySlug: string) => {
    setSelectedCity(citySlug)           // 'kaliningrad', 'moscow', 'spb', ...
    setCurrentPage('popularRoutes')
  }

  // === ЛОАДЕР, ПОКА НЕ ГОТОВ TELEGRAM WEBAPP ===
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

  // === ОСНОВНАЯ РАЗМЕТКА ===
  return (
    <Layout
      onGoToTripsList={goToTripsList}
      onGoToMyTrips={handleOpenMyTrips}
      onCreateTrip={handleCreateTripClick}
    >
      {/* глобальная ошибка */}
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

      {/* начальный лоадер только для списка маршрутов */}
      {isLoading && currentPage === 'tripsList' && trips.length === 0 && (
        <div style={{ padding: 16 }}>Загружаем маршруты…</div>
      )}

      {/* онбординг */}
      {currentPage === 'onboarding' && (
        <OnboardingPage
          tgUser={tgUser}
          onContinue={() => setCurrentPage('tripsList')}
        />
      )}

      {/* главный экран со списком поездок и городами */}
      {currentPage === 'tripsList' && (
        <TripsListPage
          trips={trips}
          onOpenTrip={goToTripDetail}
          onCreateTrip={handleCreateTripClick}
          onOpenPopular={handleOpenPopularRoutes}
        />
      )}

      {/* популярные маршруты по выбранному городу */}
      {currentPage === 'popularRoutes' && selectedCity && (
        <PopularRoutesPage
          city={selectedCity}
          onBack={goToTripsList}
        />
      )}

      {/* детальная поездка */}
      {currentPage === 'tripDetail' && selectedTripId && (
        <TripDetailPage
          tripId={selectedTripId}
          appUser={appUser}
          onCopySuccess={() => setCurrentPage('myTrips')}
        />
      )}

      {/* создание поездки */}
      {currentPage === 'tripCreate' && appUser && (
        <TripCreatePage author={appUser} onCreated={handleTripCreated} />
      )}

      {/* мои поездки */}
      {currentPage === 'myTrips' && appUser && (
        <MyTripsPage appUser={appUser} />
      )}
    </Layout>
  )
}
