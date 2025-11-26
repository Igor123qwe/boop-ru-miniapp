// src/data/popularRoutes/types.ts

export type PopularRoutePoint = {
  time?: string
  title: string
  description?: string

  // опционально: если хочешь явно указать, какую статью Википедии брать
  // например: 'Кафедральный собор (Калининград)'
  wikiTitle?: string

  // локальные картинки точки (как и было)
  images?: string[]
}

export type PopularRouteDay = {
  title: string
  description?: string
  points: PopularRoutePoint[]
}

export type PopularRoute = {
  id: string
  city: string
  title: string
  daysCount: number
  shortDescription: string
  days: PopularRouteDay[]

  // доп. инфа по маршруту (мы уже использовали)
  distanceKm?: number
  durationText?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  popularity?: number

  // ссылки для Яндекс Карт
  yandexMapUrl?: string
  yandexMapEmbedUrl?: string
}
