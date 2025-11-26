import React from 'react'

interface TopBarProps {
  onLogoClick: () => void
  onMyTripsClick: () => void
  onCreateTripClick: () => void
}

export const TopBar: React.FC<TopBarProps> = ({
  onLogoClick,
  onMyTripsClick,
  onCreateTripClick,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        backgroundColor: '#ffffff',
      }}
    >
      <button
        onClick={onLogoClick}
        style={{
          border: 'none',
          background: 'none',
          fontWeight: 600,
          fontSize: 16,
          padding: 0,
        }}
      >
        boop.ru
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onMyTripsClick}
          style={{
            borderRadius: 999,
            border: '1px solid rgba(0,0,0,0.15)',
            background: '#fff',
            padding: '4px 10px',
            fontSize: 13,
          }}
        >
          Мои поездки
        </button>
        <button
          onClick={onCreateTripClick}
          style={{
            borderRadius: 999,
            border: 'none',
            background: '#000',
            color: '#fff',
            padding: '4px 10px',
            fontSize: 13,
          }}
        >
          Создать маршрут
        </button>
      </div>
    </header>
  )
}
