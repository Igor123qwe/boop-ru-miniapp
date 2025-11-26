import React from 'react'
import type { AppUser } from '../types'

interface MyTripsPageProps {
  appUser: AppUser
}

export const MyTripsPage: React.FC<MyTripsPageProps> = ({ appUser }) => {
  return (
    <div>
      <h3>Мои поездки</h3>
      <p style={{ fontSize: 13 }}>
        Здесь позже будет список твоих скопированных маршрутов и тех, что ты
        сам создал (автор).
      </p>
      <p style={{ fontSize: 12, color: '#666' }}>
        Пользователь: {appUser.name} (id: {appUser.id})
      </p>
    </div>
  )
}
