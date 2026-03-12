import React from 'react'
import './HomePage.css'

type Props = {
  onOpenCity: (city: string) => void
  onOpenFeed: () => void
}

const CITIES = [
  { id: 'Калининград', subtitle: 'Море, архитектура, маршруты' },
  { id: 'Москва', subtitle: 'Городские прогулки и точки' },
  { id: 'Санкт-Петербург', subtitle: 'Атмосфера, музеи, каналы' },
  { id: 'Сочи', subtitle: 'Море, природа, выходные' },
  { id: 'Казань', subtitle: 'История, еда, центр города' },
]

export const HomePage: React.FC<Props> = ({ onOpenCity, onOpenFeed }) => {
  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-badge">travel social app</div>
        <h1>ProGid</h1>
        <p>
          Находи красивые места, сохраняй маршруты, собирай свои поездки и смотри,
          куда ходят другие.
        </p>

        <div className="home-hero-actions">
          <button className="home-primary-btn" onClick={() => onOpenCity('Калининград')}>
            Открыть маршруты
          </button>
          <button className="home-secondary-btn" onClick={onOpenFeed}>
            Смотреть ленту
          </button>
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-title">Популярные города</div>

        <div className="home-city-grid">
          {CITIES.map(city => (
            <button
              key={city.id}
              type="button"
              className="home-city-card"
              onClick={() => onOpenCity(city.id)}
            >
              <div className="home-city-name">{city.id}</div>
              <div className="home-city-subtitle">{city.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="home-section">
        <div className="home-section-title">Как это работает</div>

        <div className="home-feature-grid">
          <div className="home-feature-card">
            <div className="home-feature-emoji">📍</div>
            <div className="home-feature-title">Места</div>
            <div className="home-feature-text">
              Карточки мест с фото, описанием и добавлением в маршрут.
            </div>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-emoji">🗺</div>
            <div className="home-feature-title">Маршруты</div>
            <div className="home-feature-text">
              Готовые сценарии поездок по дням и свои сохранённые планы.
            </div>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-emoji">👥</div>
            <div className="home-feature-title">Соцсеть</div>
            <div className="home-feature-text">
              Лента мест и маршрутов, которые публикуют пользователи.
            </div>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-emoji">🤖</div>
            <div className="home-feature-title">AI</div>
            <div className="home-feature-text">
              Дальше сюда добавим персональный маршрут под интересы и темп.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}