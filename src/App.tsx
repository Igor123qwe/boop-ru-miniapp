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

type Page =
  | 'onboarding'
  | 'tripsList'
  | 'tripDetail'
  | 'tripCreate'
  | 'myTrips'

export const App: React.FC = () => {
  const { tgUser, isReady } = useTelegramWebApp()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [currentPage, setCurrentPage] = useState<Page>('onboarding')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripTemplate[]>([])

  useEffect(() => {
    if (!isReady) return
    const init = async () => {
      if (tgUser) {
        const user = await api.getOrCreateUserFromTelegram(tgUser.id)
        setAppUser(user)
        setCurrentPage('tripsList')
        const list = await api.listTrips()
        setTrips(list)
      } else {
        setCurrentPage('onboarding')
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

  if (!isReady) {
    return <div style={{ padding: 16 }}>Загрузка приложения…</div>
  }

  return (
    <Layout
      onGoToTripsList={() => setCurrentPage('tripsList')}
      onGoToMyTrips={handleOpenMyTrips}
      onCreateTrip={handleCreateTripClick}
    >
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
