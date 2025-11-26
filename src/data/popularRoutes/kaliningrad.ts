// src/data/popularRoutes/kaliningrad.ts
import type { PopularRoute } from './types'

export const KALININGRAD_ROUTES: PopularRoute[] = [
  // ─────────────────────────
  // 1) КАЛИНИНГРАД ЗА 1 ДЕНЬ
  // ─────────────────────────
  {
    id: 'kaliningrad_day_1',
    city: 'Калининград',
    title: 'Калининград за 1 день',
    daysCount: 1,
    shortDescription: 'Центр города, набережная и немного фортификации.',
    yandexMapUrl:
      'https://yandex.ru/maps/?rtext=54.7103,20.5101~54.7037,20.5153~54.7077,20.5084~54.7240,20.4573~54.7408,20.4331&rtt=auto',
    yandexMapEmbedUrl:
      'https://yandex.ru/map-widget/v1/?rtext=54.7103,20.5101~54.7037,20.5153~54.7077,20.5084~54.7240,20.4573~54.7408,20.4331&rtt=auto',
    distanceKm: 25,
    durationText: 'Около 30–40 минут чистого пути на машине',
    difficulty: 'easy',
    popularity: 100,
    days: [
      {
        title: 'День 1',
        description: 'Классический маршрут по основным точкам города.',
        points: [
          {
            time: '10:00',
            title: 'Кафедральный собор и остров Канта',
            description: 'Прогулка по острову, собор, могила Канта.',
            images: [
              '/img/kaliningrad/cathedral-1.jpg',
              '/img/kaliningrad/cathedral-2.jpg',
            ],
          },
          {
            time: '11:30',
            title: 'Музей Мирового океана',
            description: 'Подлодка Б-413, судно «Витязь», набережная.',
            images: [
              '/img/kaliningrad/ocean-museum-1.jpg',
              '/img/kaliningrad/ocean-museum-2.jpg',
            ],
          },
          {
            time: '13:30',
            title: 'Обед в районе Рыбной деревни',
            description: 'Рыбные рестораны с видом на реку Преголя.',
            images: ['/img/kaliningrad/fish-village-1.jpg'],
          },
          {
            time: '14:30',
            title: 'Рыбная деревня и набережная',
            description: 'Прогулка, смотровая башня и красивые фото.',
            images: [
              '/img/kaliningrad/fish-village-2.jpg',
              '/img/kaliningrad/fish-village-3.jpg',
            ],
          },
          {
            time: '16:00',
            title: 'Верхнее озеро и парк «Юность»',
            description: 'Аттракционы, лодки, спокойная прогулка.',
            images: [
              '/img/kaliningrad/upper-lake-1.jpg',
              '/img/kaliningrad/upper-lake-2.jpg',
            ],
          },
          {
            time: '18:00',
            title: 'Форт №5',
            description: 'Музей, крепостные валы, атмосферные виды.',
            images: [
              '/img/kaliningrad/fort5-1.jpg',
              '/img/kaliningrad/fort5-2.jpg',
            ],
          },
          {
            time: '20:00',
            title: 'Ужин в центре',
            description: 'Например, «Пармезан» или «Мадам Буше».',
            images: ['/img/kaliningrad/dinner-center-1.jpg'],
          },
        ],
      },
    ],
  },

  // ─────────────────────────
  // 2) КАЛИНИНГРАД ЗА 2 ДНЯ
  // ─────────────────────────
  {
    id: 'kaliningrad_2_days',
    city: 'Калининград',
    title: 'Калининград за 2 дня',
    daysCount: 2,
    shortDescription: 'Город + выезд к морю: Светлогорск и Янтарный.',
    yandexMapUrl:
      'https://yandex.ru/maps/?rtext=54.7103,20.5101~54.9430,20.1510~54.8780,19.9390~54.7103,20.5101&rtt=auto',
    yandexMapEmbedUrl:
      'https://yandex.ru/map-widget/v1/?rtext=54.7103,20.5101~54.9430,20.1510~54.8780,19.9390~54.7103,20.5101&rtt=auto',
    distanceKm: 140,
    durationText: 'Около 2–2,5 часов в дороге за два дня',
    difficulty: 'medium',
    popularity: 90,
    days: [
      {
        title: 'День 1 — Город',
        description: 'Знакомство с Калининградом: центр, набережная, форты.',
        points: [
          {
            time: '10:00',
            title: 'Остров Канта и Кафедральный собор',
            description: 'Прогулка по острову, орган, могила Канта.',
            images: ['/img/kaliningrad/cathedral-1.jpg'],
          },
          {
            time: '11:30',
            title: 'Музей Мирового океана',
            description: 'Подлодка Б-413, «Витязь», набережная.',
            images: ['/img/kaliningrad/ocean-museum-1.jpg'],
          },
          {
            time: '13:30',
            title: 'Обед в Рыбной деревне',
            description: 'Ресторанчики с видом на воду и маяк.',
          },
          {
            time: '15:00',
            title: 'Верхнее озеро и парк «Юность»',
            description: 'Колесо обозрения, аттракционы, велопрогулка.',
          },
          {
            time: '18:00',
            title: 'Форт №5',
            description:
              'Вечерняя прогулка по фортификации, музей под открытым небом.',
          },
        ],
      },
      {
        title: 'День 2 — Море: Светлогорск и Янтарный',
        description:
          'Выезд к Балтийскому морю, променады, пляжи и смотровые площадки.',
        points: [
          {
            time: '09:00',
            title: 'Переезд в Светлогорск',
            description: 'Около часа в дороге из Калининграда.',
            images: ['/img/kaliningrad/svetlogorsk-road.jpg'],
          },
          {
            time: '10:00',
            title: 'Променад Светлогорска',
            description:
              'Набережная, спуск к морю на лифте, скульптуры и вид на Балтику.',
            images: ['/img/kaliningrad/svetlogorsk-promenade-1.jpg'],
          },
          {
            time: '12:00',
            title: 'Кафе/обед в Светлогорске',
            description: 'Ресторан с видом на море или в центре города.',
          },
          {
            time: '14:00',
            title: 'Переезд в Янтарный',
            description: 'Красивая дорога вдоль побережья, около 40 минут.',
          },
          {
            time: '15:00',
            title: 'Пляж Янтарного и смотровые площадки',
            description:
              'Пляж с голубым флагом, пирс, деревянные настилы, прогулки по дюнам.',
            images: ['/img/kaliningrad/yantarny-beach-1.jpg'],
          },
          {
            time: '18:00',
            title: 'Возвращение в Калининград',
            description: 'Ужин уже в городе или по пути.',
          },
        ],
      },
    ],
  },

  // ─────────────────────────
  // 3) 3 ДНЯ В КАЛИНИНГРАДЕ
  // ─────────────────────────
  {
    id: 'kaliningrad_3_days',
    city: 'Калининград',
    title: '3 дня в Калининграде',
    daysCount: 3,
    shortDescription:
      'Город, море и Куршская коса — полный набор впечатлений.',
    yandexMapUrl:
      'https://yandex.ru/maps/?rtext=54.7103,20.5101~54.9430,20.1510~54.8780,19.9390~54.9630,20.4760~55.0000,20.6500~54.7103,20.5101&rtt=auto',
    yandexMapEmbedUrl:
      'https://yandex.ru/map-widget/v1/?rtext=54.7103,20.5101~54.9430,20.1510~54.8780,19.9390~54.9630,20.4760~55.0000,20.6500~54.7103,20.5101&rtt=auto',
    distanceKm: 220,
    durationText: 'Около 3–3,5 часов чистого пути за три дня',
    difficulty: 'hard',
    popularity: 95,
    days: [
      {
        title: 'День 1 — Город и форты',
        description: 'Основные городские точки + фортификационное наследие.',
        points: [
          {
            time: '10:00',
            title: 'Кафедральный собор и остров Канта',
            description: 'Главная визитная карточка города.',
          },
          {
            time: '11:30',
            title: 'Музей Мирового океана',
            description: 'Подлодка, суда, экспозиция о морях и океанах.',
          },
          {
            time: '13:30',
            title: 'Обед в центре / Рыбная деревня',
            description: 'Рыбные блюда, местная кухня.',
          },
          {
            time: '15:00',
            title: 'Верхнее озеро, парк «Юность»',
            description: 'Спокойная прогулка, катамараны, колесо обозрения.',
          },
          {
            time: '17:00',
            title: 'Форт №5 или другой форт по выбору',
            description: 'Атмосферные руины, музей, фото на закате.',
          },
        ],
      },
      {
        title: 'День 2 — Светлогорск и Янтарный',
        description:
          'Курортные города на побережье, променады и пляжи с голубым флагом.',
        points: [
          {
            time: '09:00',
            title: 'Переезд в Светлогорск',
            description: 'Около часа пути от Калининграда.',
          },
          {
            time: '10:00',
            title: 'Светлогорский променад',
            description:
              'Лифт к морю, набережная, скульптуры, кофе с видом на Балтику.',
          },
          {
            time: '13:00',
            title: 'Обед в Светлогорске',
            description:
              'Ресторан/кафе на побережье или в центре, местная кухня.',
          },
          {
            time: '14:30',
            title: 'Переезд в Янтарный',
            description: 'Короткая поездка вдоль моря.',
          },
          {
            time: '15:00',
            title: 'Пляж Янтарного и пирс',
            description:
              'Длинная набережная, пирс, смотровая, прогулка по песку и настилам.',
          },
          {
            time: '18:00',
            title: 'Возвращение в Калининград',
            description: 'Ужин и прогулка по вечернему городу.',
          },
        ],
      },
      {
        title: 'День 3 — Зеленоградск и Куршская коса',
        description:
          'Город котов, Куршский залив и уникальная природа национального парка.',
        points: [
          {
            time: '09:00',
            title: 'Переезд в Зеленоградск',
            description: 'Около 40 минут пути от Калининграда.',
          },
          {
            time: '10:00',
            title: 'Променад Зеленоградска',
            description:
              'Набережная, домик котов, прогулка вдоль моря и пирс.',
          },
          {
            time: '12:30',
            title: 'Обед в Зеленоградске',
            description: 'Кафе с видом на море или в центре.',
          },
          {
            time: '14:00',
            title: 'Заезд на Куршскую косу',
            description:
              'Въезд в национальный парк, смотровые площадки, дюны и лес.',
          },
          {
            time: '15:00',
            title: 'Тропа (Высота Эфа / Танцующий лес)',
            description:
              'Маршруты по деревянным настилам, виды на залив и море.',
          },
          {
            time: '18:00',
            title: 'Возвращение в Калининград',
            description: 'Ужин и прогулка по вечернему городу.',
          },
        ],
      },
    ],
  },
]

export default KALININGRAD_ROUTES
