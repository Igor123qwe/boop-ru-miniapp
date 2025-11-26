import type { PopularRoute } from './types'

import kaliningrad from './kaliningrad'
import moscow from './moscow'
import spb from './spb'
import sochi from './sochi'
import kazan from './kazan'

export type { PopularRoute }

// Ключи совпадают с city.id из TripsListPage
export const POPULAR_ROUTES: Record<string, PopularRoute[]> = {
  kaliningrad,
  moscow,
  spb,
  sochi,
  kazan,
}
