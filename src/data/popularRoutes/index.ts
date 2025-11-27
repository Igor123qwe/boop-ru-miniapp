// src/data/popularRoutes/index.ts
import type { PopularRoute } from './types'

import { KALININGRAD_ROUTES } from './kaliningrad'
import { MOSCOW_ROUTES } from './moscow'
import { SPB_ROUTES } from './spb'
import { SOCHI_ROUTES } from './sochi'
import { KAZAN_ROUTES } from './kazan'

export type { PopularRoute }

// Карта "город → маршруты"
export const POPULAR_ROUTES: Record<string, PopularRoute[]> = {
  Калининград: KALININGRAD_ROUTES,
  Москва: MOSCOW_ROUTES,
  'Санкт-Петербург': SPB_ROUTES,
  Сочи: SOCHI_ROUTES,
  Казань: KAZAN_ROUTES,
}
