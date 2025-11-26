// src/data/popularRoutes/kaliningrad.ts
import type { PopularRoute } from './types'

const kaliningrad: PopularRoute[] = [
  {
    id: 'kaliningrad_day_1',
    city: 'Калининград',
    title: 'Калининград за 1 день',
    daysCount: 1,
    shortDescription: 'Центр города, набережная и немного фортификации.',
    // обычная ссылка (открываем в Яндекс.Картах / Навигаторе)
    yandexMapUrl:
      'https://yandex.ru/maps/?rtext=54.7103,20.5101~54.7037,20.5153~54.7077,20.5084~54.7240,20.4573~54.7408,20.4331&rtt=auto',
    // ссылка для встраивания той же карты
    yandexMapEmbedUrl:
      'https://yandex.ru/map-widget/v1/?rtext=54.7103,20.5101~54.7037,20.5153~54.7077,20.5084~54.7240,20.4573~54.7408,20.4331&rtt=auto',
    distanceKm: 25,
    durationText: 'Около 30–40 минут чистого пути на машине',
    days: [
      {
        title: 'День 1',
        description: 'Классический маршрут по основным точкам города.',
        points: [
          {
            time: '10:00',
            title: 'Кафедральный собор и остров Канта',
            description: 'Прогулка по острову, собор, могила Канта.'
          },
          {
            time: '11:30',
            title: 'Музей Мирового океана',
            description: 'Подлодка Б-413, судно «Витязь», набережная.'
          },
          {
            time: '13:30',
            title: 'Обед в районе Рыбной деревни',
            description: 'Рыбные рестораны с видом на реку Преголя.'
          },
          {
            time: '14:30',
            title: 'Рыбная деревня и набережная',
            description: 'Прогулка, смотровая башня и красивые фото.'
          },
          {
            time: '16:00',
            title: 'Верхнее озеро и парк «Юность»',
            description: 'Аттракционы, лодки, спокойная прогулка.'
          },
          {
            time: '18:00',
            title: 'Форт №5',
            description: 'Музей, крепостные валы, атмосферные виды.'
          },
          {
            time: '20:00',
            title: 'Ужин в центре',
            description: 'Например, «Пармезан» или «Мадам Буше».'
          }
        ]
      }
    ]
  }
]

export default kaliningrad
