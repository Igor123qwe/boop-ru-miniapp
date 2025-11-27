import type { TripTemplate, TripDay, UserTrip } from './types'

// ====== MOCK-данные для теста ======

const MOCK_TRIPS: TripTemplate[] = [
  {
    id: 'trip_dagestan_5',
    authorId: 'author_1',
    title: '5 дней в Дагестане из Москвы – без машины',
    region: 'Дагестан',
    daysCount: 5,
    format: 'couple',
    budgetMin: 50000,
    budgetMax: 80000,
    comfortLevel: 'standard',
    descriptionShort: 'Каньоны, море, вкусная еда, без жёсткого оффроуда.',
    createdAt: new Date().toISOString(),
    isPublished: true,
    copiesCount: 12,
  },
]

const MOCK_DAYS: TripDay[] = [
  {
    id: 'day_1',
    tripId: 'trip_dagestan_5',
    dayNumber: 1,
    summary: 'Прилёт/приезд, заселение, прогулка по набережной',
    activities: [
      {
        timeApprox: 'утро',
        title: 'Приезд в Махачкалу / Каспийск',
        description: 'Заселение в отель, оставить вещи, немного отдохнуть.',
      },
      {
        timeApprox: 'день',
        title: 'Обед в кафе у моря',
        description: 'Место с национальной кухней, можно с детьми.',
      },
      {
        timeApprox: 'вечер',
        title: 'Прогулка по набережной',
        description: 'Спокойный старт поездки, без сильных нагрузок.',
      },
    ],
  },
]

// Тип ответа бэка с фотографиями
type PhotosResponse = {
  status?: string
  photos?: string[]
}

// ====== API-объект ======

export const api = {
  // --- Пользователь из Telegram ---

  async getOrCreateUserFromTelegram(tgId: number) {
    return {
      id: `user_${tgId}`,
      telegramId: tgId,
      name: `User ${tgId}`,
      createdAt: new Date().toISOString(),
    }
  },

  // --- Туршаблоны ---

  async listTrips(params?: { region?: string; format?: string }) {
    // Пока просто возвращаем mock
    return MOCK_TRIPS
  },

  async getTripById(id: string) {
    const trip = MOCK_TRIPS.find(t => t.id === id)
    if (!trip) throw new Error('Trip not found')
    const days = MOCK_DAYS.filter(d => d.tripId === id).sort(
      (a, b) => a.dayNumber - b.dayNumber,
    )
    return { trip, days }
  },

  async createTripDraft(payload: {
    authorId: string
    title: string
    region: string
    daysCount: number
    format: string
    descriptionShort: string
  }) {
    const newTrip: TripTemplate = {
      id: `trip_${Date.now()}`,
      authorId: payload.authorId,
      title: payload.title,
      region: payload.region,
      daysCount: payload.daysCount,
      format: payload.format as any,
      descriptionShort: payload.descriptionShort,
      createdAt: new Date().toISOString(),
      isPublished: false,
      copiesCount: 0,
    }
    return newTrip
  },

  async copyTripForUser(tripId: string, userId: string): Promise<UserTrip> {
    return {
      id: `usertrip_${Date.now()}`,
      ownerId: userId,
      templateId: tripId,
      createdAt: new Date().toISOString(),
    }
  },

  // --- Фотки для целого дня по городу (папки <citySlug>_day_N в корне города) ---

  /**
   * Возвращает фотографии для конкретного дня по городу.
   * Ищет в бакете по префиксу:
   *   progid-images/<город_кириллица>/<citySlug>_day_<dayNumber>/
   * где <город_кириллица> = city в нижнем регистре (например, "калининград"),
   * а citySlug определяется на бэке через cityToSlug.
   */
  async getCityDayPhotos(city: string, dayNumber: number = 1): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        city,
        day: String(dayNumber),
      })

      const res = await fetch(`/api/cityDayPhotos?${params.toString()}`)

      if (!res.ok) {
        console.error('[api.getCityDayPhotos] HTTP error', res.status)
        return []
      }

      const data: PhotosResponse = await res.json()
      if (Array.isArray(data.photos)) {
        return data.photos
      }
      return []
    } catch (e) {
      console.error('[api.getCityDayPhotos] error', e)
      return []
    }
  },

  // --- Фотки для конкретной точки маршрута (routeId + pointIndex) ---

  /**
   * Возвращает фотографии для конкретной точки маршрута.
   * Бэк ходит в:
   *   progid-images/<город_кириллица>/<routeId>/point_<pointIndex>/
   * и при отсутствии фоток может запустить парсер.
   */
  async getPointPhotos(params: {
    city: string
    routeId: string
    pointIndex: number
    title?: string
  }): Promise<string[]> {
    const { city, routeId, pointIndex, title } = params

    try {
      const search = new URLSearchParams({
        city,
        routeId,
        pointIndex: String(pointIndex),
      })
      if (title) {
        search.set('title', title)
      }

      const res = await fetch(`/api/photos?${search.toString()}`)

      if (!res.ok) {
        console.error('[api.getPointPhotos] HTTP error', res.status)
        return []
      }

      const data: PhotosResponse = await res.json()
      if (Array.isArray(data.photos)) {
        return data.photos
      }
      return []
    } catch (e) {
      console.error('[api.getPointPhotos] error', e)
      return []
    }
  },
}
