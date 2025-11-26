export type TravelFormat = 'family' | 'couple' | 'friends' | 'solo'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface AppUser {
  id: string
  telegramId: number
  name: string
  createdAt: string
}

export interface TripTemplate {
  id: string
  authorId: string
  title: string
  region: string
  daysCount: number
  format: TravelFormat
  budgetMin?: number
  budgetMax?: number
  comfortLevel?: 'budget' | 'standard' | 'premium'
  descriptionShort: string
  descriptionFull?: string
  tips?: string
  createdAt: string
  isPublished: boolean
  copiesCount: number
}

export interface TripDay {
  id: string
  tripId: string
  dayNumber: number
  summary: string
  activities: DayActivity[]
}

export interface DayActivity {
  timeApprox?: string
  title: string
  description?: string
  locationName?: string
  locationUrl?: string
}

export interface UserTrip {
  id: string
  ownerId: string
  templateId: string
  startDate?: string
  peopleCount?: number
  budgetOverrideMin?: number
  budgetOverrideMax?: number
  customNotes?: string
  createdAt: string
}
