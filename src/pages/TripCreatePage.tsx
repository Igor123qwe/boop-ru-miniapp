import React, { useState } from 'react'
import type { AppUser, TravelFormat, TripTemplate } from '../types'
import { api } from '../api'

interface TripCreatePageProps {
  author: AppUser
  onCreated: (trip: TripTemplate) => void
}

export const TripCreatePage: React.FC<TripCreatePageProps> = ({
  author,
  onCreated,
}) => {
  const [title, setTitle] = useState('')
  const [region, setRegion] = useState('')
  const [daysCount, setDaysCount] = useState(5)
  const [format, setFormat] = useState<TravelFormat>('couple')
  const [descriptionShort, setDescriptionShort] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !region || !descriptionShort) return
    setIsSaving(true)
    try {
      const trip = await api.createTripDraft({
        authorId: author.id,
        title,
        region,
        daysCount,
        format,
        descriptionShort,
      })
      onCreated(trip)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <h3>Новый маршрут</h3>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        Заполни базовую информацию. Детализацию по дням добавим на следующем
        шаге.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Название маршрута</span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="5 дней в Дагестане из Москвы – без машины"
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 13,
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Регион / город</span>
          <input
            value={region}
            onChange={e => setRegion(e.target.value)}
            placeholder="Дагестан / Калининград / Сочи"
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 13,
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Сколько дней</span>
          <input
            type="number"
            min={1}
            max={30}
            value={daysCount}
            onChange={e => setDaysCount(Number(e.target.value))}
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 13,
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Формат</span>
          <select
            value={format}
            onChange={e => setFormat(e.target.value as TravelFormat)}
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 13,
            }}
          >
            <option value="family">Семья</option>
            <option value="couple">Пара</option>
            <option value="friends">Друзья</option>
            <option value="solo">Соло</option>
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>Краткое описание</span>
          <textarea
            value={descriptionShort}
            onChange={e => setDescriptionShort(e.target.value)}
            placeholder="Вкусная еда, каньоны, море, без длинных треккингов. Подойдёт пары/семьи."
            rows={3}
            style={{
              width: '100%',
              marginTop: 4,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ccc',
              fontSize: 13,
            }}
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            marginTop: 12,
            width: '100%',
            borderRadius: 12,
            border: 'none',
            background: '#000',
            color: '#fff',
            padding: '10px 16px',
            fontSize: 14,
          }}
        >
          {isSaving ? 'Сохраняем…' : 'Создать черновик'}
        </button>
      </form>
    </div>
  )
}
