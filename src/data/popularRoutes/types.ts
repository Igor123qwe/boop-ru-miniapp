// src/data/popularRoutes/types.ts

export type PopularRoutePoint = {
  time?: string
  title: string
  description?: string
  // 🔹 изображения для карусели
  images?: string[] // массив URL картинок
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

  difficulty?: RouteDifficulty
  popularity?: number
}
