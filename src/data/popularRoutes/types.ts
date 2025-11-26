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

export type PopularRoute = {
  id: string
  city: string
  title: string
  daysCount: number
  shortDescription: string
  days: PopularRouteDay[]
  // 🔥 ссылка на маршрут в Яндекс.Картах
  yandexMapUrl: string
}
