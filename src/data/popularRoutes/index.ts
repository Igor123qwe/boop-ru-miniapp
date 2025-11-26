// src/data/popularRoutes/index.ts
import type { PopularRoute } from './types'

// Импортируем весь модуль, не default
import * as kaliningradModule from './kaliningrad'
import * as moscowModule from './moscow'
import * as spbModule from './spb'
import * as sochiModule from './sochi'
import * as kazanModule from './kazan'

// Функция: берём первый экспорт из модуля как массив маршрутов
const getRoutes = (mod: Record<string, unknown>): PopularRoute[] => {
  const values = Object.values(mod)
  const first = values[0]
  return Array.isArray(first) ? (first as PopularRoute[]) : []
}

// Массивы маршрутов из файлов
const kaliningrad = getRoutes(kaliningradModule)
const moscow = getRoutes(moscowModule)
const spb = getRoutes(spbModule)
const sochi = getRoutes(sochiModule)
const kazan = getRoutes(kazanModule)

export type { PopularRoute }

// Карта "город → маршруты"
export const POPULAR_ROUTES: Record<string, PopularRoute[]> = {
  Калининград: kaliningrad,
  Москва: moscow,
  'Санкт-Петербург': spb,
  Сочи: sochi,
  Казань: kazan,
}
