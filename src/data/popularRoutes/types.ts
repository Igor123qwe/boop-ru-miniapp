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

  // ссылки для Яндекс.Карт
  yandexMapUrl: string            // открыть в приложении/отдельной вкладке
  yandexMapEmbedUrl: string       // встроенная карта (iframe)

  // инфа о маршруте
  distanceKm?: number             // протяжённость, км
  durationText?: string           // текст типа "30–40 минут в пути"
}
