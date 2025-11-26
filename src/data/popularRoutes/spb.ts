// src/data/popularRoutes/spb.ts
import type { PopularRoute } from './types'

export const SPB_ROUTES: PopularRoute[] = [
  {
    id: 'spb-1',
    city: 'Санкт-Петербург',
    title: 'Петербург за 1 день',
    daysCount: 1,
    shortDescription: 'Самые узнаваемые виды центра.',
    days: [
      {
        title: 'День 1',
        points: [
          { time: '10:00', title: 'Невский проспект и Казанский собор' },
          { time: '11:30', title: 'Спас-на-Крови' },
          { time: '13:00', title: 'Эрмитаж' },
          { time: '16:30', title: 'Стрелка Васильевского острова' },
          { time: '18:00', title: 'Дворцовая и Адмиралтейство' },
          { time: '21:00', title: 'Развод мостов (в сезон)' },
        ],
      },
    ],
  },
  {
    id: 'spb-2',
    city: 'Санкт-Петербург',
    title: 'Петербург за 2 дня',
    daysCount: 2,
    shortDescription: 'Центр + фонтаны Петергофа.',
    days: [
      {
        title: 'День 1 — центр',
        points: [
          { time: '10:00', title: 'Невский, Казанский собор' },
          { time: '12:00', title: 'Эрмитаж' },
          { time: '16:00', title: 'Петропавловская крепость' },
        ],
      },
      {
        title: 'День 2 — Петергоф',
        points: [
          { time: '10:00', title: 'Верхний сад, дворец' },
          { time: '12:00', title: 'Нижний парк и фонтаны' },
          { time: '16:00', title: 'Прогулка вдоль Финского залива' },
        ],
      },
    ],
  },
  {
    id: 'spb-3',
    city: 'Санкт-Петербург',
    title: 'Петербург за 3 дня',
    daysCount: 3,
    shortDescription: 'История, дворцы и морской воздух.',
    days: [
      {
        title: 'День 1 — центр',
        points: [{ time: '10:00', title: 'Невский и основные храмы' }],
      },
      {
        title: 'День 2 — Петергоф',
        points: [{ time: '10:00', title: 'Фонтаны и парк' }],
      },
      {
        title: 'День 3 — Кронштадт',
        points: [
          { time: '10:00', title: 'Морской собор' },
          { time: '13:00', title: 'Форты и набережная' },
        ],
      },
    ],
  },
]
