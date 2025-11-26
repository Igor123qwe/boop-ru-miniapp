import React from 'react'
import type { TelegramUser } from '../types'

interface OnboardingPageProps {
  tgUser: TelegramUser | null
  onContinue: () => void
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  tgUser,
  onContinue,
}) => {
  return (
    <div>
      <h2>Привет{tgUser?.first_name ? `, ${tgUser.first_name}` : ''}! 👋</h2>
      <p style={{ fontSize: 14, marginBottom: 12 }}>
        Это мини-приложение для путешествий по реальным маршрутам людей, а не
        фантазиям ИИ.
      </p>
      <ul style={{ fontSize: 13, paddingLeft: 16 }}>
        <li>Выбирай готовые проверенные маршруты</li>
        <li>Копируй и адаптируй под себя</li>
        <li>Создавай свои и зарабатывай на рекомендациях</li>
      </ul>

      <button
        onClick={onContinue}
        style={{
          marginTop: 16,
          borderRadius: 999,
          border: 'none',
          background: '#000',
          color: '#fff',
          padding: '8px 16px',
          fontSize: 14,
        }}
      >
        Перейти к маршрутам
      </button>
    </div>
  )
}
