export type SocialPostType = 'place' | 'route'

export type SocialPost = {
  id: string
  type: SocialPostType
  title: string
  city: string
  image: string
  author: string
  authorId: string
  description?: string
  likes: number
  saved: boolean
  createdAt: string
}

export const INITIAL_SOCIAL_FEED: SocialPost[] = [
  {
    id: 'post_1',
    type: 'place',
    title: 'Кафедральный собор',
    city: 'Калининград',
    image:
      'https://storage.yandexcloud.net/progid-images-novichihin/калининград/city-cover.jpg',
    author: 'Анна',
    authorId: 'user_anna',
    description: 'Одно из главных мест города. Лучше приходить ближе к вечеру.',
    likes: 23,
    saved: false,
    createdAt: '2026-03-10T12:00:00.000Z',
  },
  {
    id: 'post_2',
    type: 'route',
    title: 'Маршрут по центру на 1 день',
    city: 'Калининград',
    image:
      'https://storage.yandexcloud.net/progid-images-novichihin/калининград/city-cover.jpg',
    author: 'Игорь',
    authorId: 'local-user',
    description: 'Кафедральный собор, остров Канта, Рыбная деревня и прогулка по центру.',
    likes: 18,
    saved: false,
    createdAt: '2026-03-11T09:30:00.000Z',
  },
]