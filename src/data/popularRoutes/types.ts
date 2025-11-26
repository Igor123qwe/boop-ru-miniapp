// src/data/popularRoutes/types.ts

export type PopularRoutePoint = {
  time?: string
  title: string
  description?: string
}

export type PopularRouteDay = {
  title: string
  description?: string
  points: PopularRoutePoint[]
}

export type RouteDifficulty = 'easy' | 'medium' | 'hard'

export type PopularRoute = {
  id: string
  city: string              // отображаемое название города, например "Калининград"
  title: string
  daysCount: number
  shortDescription: string
  days: PopularRouteDay[]

  // Яндекс.Карты
  yandexMapUrl: string
  yandexMapEmbedUrl: string

  distanceKm?: number
  durationText?: string

  // 🔹 новые поля для фильтров/сортировки
  difficulty?: RouteDifficulty   // сложность маршрута
  popularity?: number            // условный рейтинг/популярность (чем больше, тем популярнее)
}
