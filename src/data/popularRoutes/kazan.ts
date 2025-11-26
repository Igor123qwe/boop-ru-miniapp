// src/data/popularRoutes/kazan.ts
import type { PopularRoute } from './types'

export const KAZAN_ROUTES: PopularRoute[] = [
  {
    id: 'kzn-1',
    city: 'Казань',
    title: 'Казань за 1 день',
    daysCount: 1,
    shortDescription: 'Кремль, Кул-Шариф и набережная.',
    days: [
      {
        title: 'День 1',
        points: [
          { time: '10:00', title: 'Казанский кремль' },
          { time: '12:00', title: 'Мечеть Кул-Шариф' },
          { time: '13:30', title: 'Бауманская улица и обед' },
          {
            time: '16:00',
            title: 'Центр семьи «Казан»',
            description: 'Смотровая площадка и виды на город.',
          },
          { time: '18:00', title: 'Набережная Казанки' },
        ],
      },
    ],
  },
  {
    id: 'kzn-2',
    city: 'Казань',
    title: 'Казань за 2 дня',
    daysCount: 2,
    shortDescription: 'Город + Свияжск и храм всех религий.',
    days: [
      {
        title: 'День 1 — центр',
        points: [
          { time: '10:00', title: 'Кремль и Кул-Шариф' },
          { time: '13:00', title: 'Бауманская и обед' },
        ],
      },
      {
        title: 'День 2 — окрестности',
        points: [
          { time: '10:00', title: 'Остров-град Свияжск' },
          { time: '14:00', title: 'Храм всех религий' },
        ],
      },
    ],
  },
  {
    id: 'kzn-3',
    city: 'Казань',
    title: 'Казань за 3 дня',
    daysCount: 3,
    shortDescription: 'Город, окрестности и немного релакса.',
    days: [
      { title: 'День 1 — центр', points: [{ time: '10:00', title: 'Кремль и центр' }] },
      { title: 'День 2 — Свияжск и храм всех религий', points: [{ time: '10:00', title: 'Свияжск' }] },
      {
        title: 'День 3 — отдых',
        points: [{ time: '10:00', title: 'Аквапарк «Ривьера» или прогулка по набережной' }],
      },
    ],
  },
]
