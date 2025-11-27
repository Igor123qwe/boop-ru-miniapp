import React, { useMemo, useState } from 'react'
import type { TripTemplate } from '../types'
import './CityRoutesPage.css'

type Props = {
  citySlug: string          // kaliningrad / moscow / ...
  cityName: string          // "Калининград"
  allTrips: TripTemplate[]  // все маршруты, отфильтруем по городу
  onBack: () => void
  onCreateCustom: () => void // открыть анкету "создать свой"
  onOpenTrip: (tripId: string) => void
}

type Difficulty = 'any' | 'easy' | 'medium' | 'hard'

export const CityRoutesPage: React.FC<Props> = ({
  citySlug,
  cityName,
  allTrips,
  onBack,
  onCreateCustom,
  onOpenTrip,
}) => {
  // режим показа
  const [showReady, setShowReady] = useState<boolean>(false)

  // диалог "Готовые маршруты"
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)

  // параметры подбора
  const [difficulty, setDifficulty] = useState<Difficulty>('any')
  const [maxDays, setMaxDays] = useState<number | null>(3)
  const [withFood, setWithFood] = useState<boolean>(false)
  const [withCafes, setWithCafes] = useState<boolean>(false)

  // включён ли режим "подбор"
  const [useFilters, setUseFilters] = useState<boolean>(false)

  // маршруты только по этому городу (если есть поле city/region – подставь своё)
  const cityTrips = useMemo(
    () =>
      allTrips.filter(t => {
        // пример: у шаблона есть поле region = "Калининград"
        return (
          (t.region ?? '').toLowerCase().includes(cityName.toLowerCase()) ||
          (t.city ?? '').toLowerCase().includes(cityName.toLowerCase())
        )
      }),
    [allTrips, cityName],
  )

  // применяем фильтры, если включен "подбор"
  const filteredTrips = useMemo(() => {
    if (!useFilters) return cityTrips

    return cityTrips.filter(trip => {
      // фильтр по дням
      if (maxDays && trip.daysCount && trip.daysCount > maxDays) {
        return false
      }

      // фильтр по сложности (если потом добавишь поле difficulty у trip – сюда)
      if (difficulty !== 'any') {
        if (trip.comfortLevel === 'standard' && difficulty === 'hard') {
          return false
        }
        // здесь можно расширить логику, когда появятся реальные поля
      }

      // "рестораны / кафе" – пока просто оставляем заглушкой,
      // позже можно будет фильтровать по тегам маршрута
      return true
    })
  }, [cityTrips, difficulty, maxDays, useFilters])

  const handleOpenReadyClick = () => {
    // при клике "Готовые маршруты" сразу открываем диалог
    setDialogOpen(true)
  }

  const handleShowAll = () => {
    setUseFilters(false)
    setShowReady(true)
    setDialogOpen(false)
  }

  const handleUseFilters = () => {
    setUseFilters(true)
    setShowReady(true)
    setDialogOpen(false)
  }

  return (
    <div className="city-routes-page">
      <div className="city-routes-header">
        <button className="back-btn" type="button" onClick={onBack}>
          ← Назад
        </button>
        <h2>Маршруты по городу {cityName}</h2>
      </div>

      {/* Две главные кнопки */}
      <div className="city-actions">
        <button
          type="button"
          className="city-action-btn primary"
          onClick={onCreateCustom}
        >
          Создать свой маршрут
        </button>
        <button
          type="button"
          className="city-action-btn secondary"
          onClick={handleOpenReadyClick}
        >
          Готовые маршруты
        </button>
      </div>

      {/* Диалог выбора: показать все / подобрать */}
      {dialogOpen && (
        <div className="city-dialog-backdrop">
          <div className="city-dialog">
            <h3>Готовые маршруты</h3>
            <p>Как показать маршруты?</p>

            <div className="dialog-buttons">
              <button type="button" onClick={handleShowAll}>
                Показать все
              </button>
              <button type="button" onClick={handleUseFilters}>
                Подобрать по параметрам
              </button>
            </div>

            {/* Простая форма фильтров (отображаем сразу, чтобы было понятно, что будет применяться) */}
            <div className="dialog-filters">
              <div className="filter-block">
                <div className="filter-label">Сложность:</div>
                <div className="filter-pills">
                  <button
                    type="button"
                    className={difficulty === 'any' ? 'pill active' : 'pill'}
                    onClick={() => setDifficulty('any')}
                  >
                    Любая
                  </button>
                  <button
                    type="button"
                    className={difficulty === 'easy' ? 'pill active' : 'pill'}
                    onClick={() => setDifficulty('easy')}
                  >
                    Лёгкие
                  </button>
                  <button
                    type="button"
                    className={difficulty === 'medium' ? 'pill active' : 'pill'}
                    onClick={() => setDifficulty('medium')}
                  >
                    Средние
                  </button>
                  <button
                    type="button"
                    className={difficulty === 'hard' ? 'pill active' : 'pill'}
                    onClick={() => setDifficulty('hard')}
                  >
                    Сложные
                  </button>
                </div>
              </div>

              <div className="filter-block">
                <div className="filter-label">
                  Максимум дней: {maxDays ?? 'без ограничений'}
                </div>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={maxDays ?? 3}
                  onChange={e => setMaxDays(Number(e.target.value))}
                />
              </div>

              <div className="filter-block">
                <div className="filter-label">Что добавить в маршрут:</div>
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={withFood}
                    onChange={e => setWithFood(e.target.checked)}
                  />
                  Рестораны
                </label>
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={withCafes}
                    onChange={e => setWithCafes(e.target.checked)}
                  />
                  Кафе и кофе-точки
                </label>
              </div>
            </div>

            <button
              type="button"
              className="dialog-close"
              onClick={() => setDialogOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Список готовых маршрутов */}
      {showReady && (
        <div className="city-ready-list">
          {filteredTrips.map(trip => (
            <button
              key={trip.id}
              type="button"
              className="ready-trip-card"
              onClick={() => onOpenTrip(trip.id)}
            >
              <div className="ready-trip-title">
                {trip.title ?? trip.name ?? 'Маршрут'}
              </div>
              <div className="ready-trip-subtitle">
                {trip.descriptionShort ??
                  trip.description ??
                  'Описание маршрута будет позже'}
              </div>
              {trip.daysCount && (
                <div className="ready-trip-days">{trip.daysCount} дн.</div>
              )}
            </button>
          ))}

          {filteredTrips.length === 0 && (
            <div className="empty-state">
              Под такие параметры пока нет маршрутов. Попробуй ослабить фильтры.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
