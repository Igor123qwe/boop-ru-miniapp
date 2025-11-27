// src/data/popularRoutes.ts

import type {
  PopularRoute,
  PopularRoutesByCity,
} from './popularRoutes/types'

import { KALININGRAD_ROUTES } from './popularRoutes/kaliningrad'
import { MOSCOW_ROUTES } from './popularRoutes/moscow'
import { SPB_ROUTES } from './popularRoutes/spb'
import { SOCHI_ROUTES } from './popularRoutes/sochi'
import { KAZAN_ROUTES } from './popularRoutes/kazan'

// экспорт типов наружу (чтобы то, что их импортирует, не ломалось)
export type { PopularRoute, PopularRoutesByCity }

// общая мапа "город → маршруты"
// Делаем и slug-и, и русские названия, чтобы что бы ни пришло в `city` — маршруты нашлись.
export const POPULAR_ROUTES: PopularRoutesByCity = {
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
