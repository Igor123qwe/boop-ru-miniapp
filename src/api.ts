import type { TripTemplate, TripDay, UserTrip } from './types'

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

export const api = {
  async getOrCreateUserFromTelegram(tgId: number) {
    return {
      id: `user_${tgId}`,
      telegramId: tgId,
      name: `User ${tgId}`,
      createdAt: new Date().toISOString(),
    }
  },

  async listTrips(params?: { region?: string; format?: string }) {
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
}
