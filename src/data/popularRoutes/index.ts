// src/data/popularRoutes/index.ts
import type { PopularRoute } from './types'

import { KALININGRAD_ROUTES } from './kaliningrad'
import { MOSCOW_ROUTES } from './moscow'
import { SPB_ROUTES } from './spb'
import { SOCHI_ROUTES } from './sochi'
import { KAZAN_ROUTES } from './kazan'

export type { PopularRoute }

// Карта "город → маршруты"
// Поддерживаем и slug-и, и русские названия,
// чтобы что бы ни пришло в `city` — маршруты нашлись.
export const POPULAR_ROUTES: Record<string, PopularRoute[]> = {
  // Калининград
  kaliningrad: KALININGRAD_ROUTES,
  Калининград: KALININGRAD_ROUTES,

  // Москва
  moscow: MOSCOW_ROUTES,
  Москва: MOSCOW_ROUTES,

  // Санкт-Петербург
  spb: SPB_ROUTES,
  'Санкт-Петербург': SPB_ROUTES,

  // Сочи
  sochi: SOCHI_ROUTES,
  Сочи: SOCHI_ROUTES,

  // Казань
  kazan: KAZAN_ROUTES,
  Казань: KAZAN_ROUTES,
}
