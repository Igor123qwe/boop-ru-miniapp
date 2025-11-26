// src/data/popularRoutes/sochi.ts
import type { PopularRoute } from './types'

export const SOCHI_ROUTES: PopularRoute[] = [
  {
    id: 'sochi-1',
    city: 'Сочи',
    title: 'Сочи за 1 день',
    daysCount: 1,
    shortDescription: 'Море, набережная и немного природы.',
    days: [
      {
        title: 'День 1',
        points: [
          { time: '10:00', title: 'Морпорт и набережная' },
          { time: '12:00', title: 'Парк «Ривьера»' },
          { time: '14:00', title: 'Обед: рапаны, устрицы, местная кухня' },
          {
            time: '16:00',
            title: 'Тисо-самшитовая роща',
            description: 'Лёгкий треккинг среди зелени.',
          },
          { time: '19:00', title: 'Закат у моря' },
        ],
      },
    ],
  },
  {
    id: 'sochi-2',
    city: 'Сочи',
    title: 'Сочи за 2 дня',
    daysCount: 2,
    shortDescription: 'Город + Красная Поляна.',
    days: [
      {
        title: 'День 1 — город и море',
        points: [
          { time: '10:00', title: 'Морпорт, набережная, парк «Ривьера»' },
          { time: '16:00', title: 'Скайпарк (по желанию)' },
        ],
      },
      {
        title: 'День 2 — Красная Поляна',
        points: [
          { time: '10:00', title: 'Роза Хутор, подъём на Роза Пик' },
          { time: '14:00', title: 'Прогулка по набережной Мзымты' },
        ],
      },
    ],
  },
  {
    id: 'sochi-3',
    city: 'Сочи',
    title: 'Сочи за 3 дня',
    daysCount: 3,
    shortDescription: 'Море, горы и водопады.',
    days: [
      { title: 'День 1 — Сочи', points: [{ time: '10:00', title: 'Центр и набережная' }] },
      { title: 'День 2 — Красная Поляна', points: [{ time: '10:00', title: 'Роза Хутор' }] },
      {
        title: 'День 3 — водопады',
        points: [{ time: '10:00', title: '33 водопада или Агурские водопады' }],
      },
    ],
  },
]
