import React from 'react'
import { TopBar } from './TopBar'

interface LayoutProps {
  children: React.ReactNode
  onGoToTripsList: () => void
  onGoToMyTrips: () => void
  onCreateTrip: () => void
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onGoToTripsList,
  onGoToMyTrips,
  onCreateTrip,
}) => {
  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <TopBar
        onLogoClick={onGoToTripsList}
        onMyTripsClick={onGoToMyTrips}
        onCreateTripClick={onCreateTrip}
      />
      <main style={{ padding: 12, flex: 1 }}>{children}</main>
    </div>
  )
}
