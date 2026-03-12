import { INITIAL_SOCIAL_FEED, type SocialPost } from '../data/socialFeed'

const FEED_KEY = 'progid_social_feed'
const SAVED_POSTS_KEY = 'progid_saved_posts'
const LIKED_POSTS_KEY = 'progid_liked_posts'

export const readFeed = (): SocialPost[] => {
  try {
    const raw = localStorage.getItem(FEED_KEY)
    if (!raw) {
      localStorage.setItem(FEED_KEY, JSON.stringify(INITIAL_SOCIAL_FEED))
      return INITIAL_SOCIAL_FEED
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : INITIAL_SOCIAL_FEED
  } catch {
    return INITIAL_SOCIAL_FEED
  }
}

export const writeFeed = (posts: SocialPost[]) => {
  localStorage.setItem(FEED_KEY, JSON.stringify(posts))
}

export const readSavedPostIds = (): string[] => {
  try {
    const raw = localStorage.getItem(SAVED_POSTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeSavedPostIds = (ids: string[]) => {
  localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(ids))
}

export const readLikedPostIds = (): string[] => {
  try {
    const raw = localStorage.getItem(LIKED_POSTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const writeLikedPostIds = (ids: string[]) => {
  localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(ids))
}