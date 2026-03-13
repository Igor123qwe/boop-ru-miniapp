import React, { useEffect, useMemo, useRef, useState } from 'react'
import { POPULAR_ROUTES, type PopularRoute } from '../data/popularRoutes'
import {
  readSavedPostIds,
  readLikedPostIds,
  writeLikedPostIds,
  writeSavedPostIds,
} from '../utils/socialStorage'
import './FeedPage.css'

console.log('FEED PAGE LOADED 777')

type Props = {
  onOpenRoutes: (city: string, routeId?: string) => void
  onCreateRoute?: () => void
  onCreatePlace?: () => void
  onCreateMoment?: () => void
}

type FeedPostType = 'route' | 'place' | 'moment'

type FeedPost = {
  id: string
  type: FeedPostType
  routeId: string
  city: string
  cityFolder: string
  title: string
  description: string
  image: string
  images: string[]
  likes: number
  daysCount?: number
  pointsCount?: number
  difficulty?: string
  distanceKm?: number
  previewPoints: string[]
  route: PopularRoute
  createdAt: string
}

const normalizeCityFolder = (city: string) => {
  return city.toLowerCase().trim()
}

const getCityCoverImage = (city: string) => {
  return `https://storage.yandexcloud.net/progid-images-novichihin/${normalizeCityFolder(
    city
  )}/city-cover.jpg`
}

const countRoutePoints = (route: PopularRoute) => {
  return route.days.reduce((sum, day) => sum + day.points.length, 0)
}

const buildRoutePreview = (route: PopularRoute) => {
  const points: string[] = []

  for (const day of route.days) {
    for (const point of day.points) {
      if (!point.title) continue
      if (!points.includes(point.title)) points.push(point.title)
      if (points.length >= 3) return points
    }
  }

  return points
}

const getAllRoutes = (): PopularRoute[] => {
  return Object.values(POPULAR_ROUTES).flat()
}

const buildFeedPosts = (): FeedPost[] => {
  const routes = getAllRoutes()
  const posts: FeedPost[] = []

  for (const route of routes) {
    const previewPoints = buildRoutePreview(route)
    const pointsCount = countRoutePoints(route)

    posts.push({
      id: `route_${route.id}`,
      type: 'route',
      routeId: route.id,
      city: route.city,
      cityFolder: normalizeCityFolder(route.city),
      title: route.title,
      description: route.shortDescription || 'Маршрут',
      image: getCityCoverImage(route.city),
      images: [],
      likes: route.popularity ?? 100,
      daysCount: route.daysCount,
      pointsCount,
      difficulty: route.difficulty,
      distanceKm: route.distanceKm,
      previewPoints,
      route,
      createdAt: new Date().toISOString(),
    })
  }

  return posts
}

export const FeedPage: React.FC<Props> = ({
  onOpenRoutes,
  onCreateRoute,
  onCreatePlace,
  onCreateMoment,
}) => {
  const [likedPostIds, setLikedPostIds] = useState<string[]>([])
  const [savedPostIds, setSavedPostIds] = useState<string[]>([])
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([])

  useEffect(() => {
    setLikedPostIds(readLikedPostIds())
    setSavedPostIds(readSavedPostIds())
  }, [])

  useEffect(() => {
    setFeedPosts(buildFeedPosts())
  }, [])

  const toggleLike = (postId: string) => {
    setLikedPostIds(prev => {
      const next = prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]

      writeLikedPostIds(next)
      return next
    })
  }

  const toggleSave = (postId: string) => {
    setSavedPostIds(prev => {
      const next = prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]

      writeSavedPostIds(next)
      return next
    })
  }

  const renderCard = (post: FeedPost) => {
    const isLiked = likedPostIds.includes(post.id)
    const isSaved = savedPostIds.includes(post.id)

    return (
      <article key={post.id} className="feed-card">
        <div className="feed-image-wrap">
          <img
            src={post.image}
            alt={post.title}
            className="feed-image"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>

        <div className="feed-content">
          <div className="feed-title">{post.title}</div>

          <div className="feed-description">{post.description}</div>

          <div className="feed-meta-line">
            <span>{post.city}</span>
            {post.distanceKm && <span>~ {post.distanceKm} км</span>}
          </div>

          {post.previewPoints.length > 0 && (
            <div className="feed-preview-points">
              {post.previewPoints.map(point => (
                <span key={point} className="feed-preview-point">
                  {point}
                </span>
              ))}
            </div>
          )}

          <div className="feed-actions">
            <button
              className={`feed-action-btn ${isLiked ? 'active' : ''}`}
              onClick={() => toggleLike(post.id)}
            >
              ❤️ {post.likes}
            </button>

            <button
              className={`feed-action-btn ${isSaved ? 'active' : ''}`}
              onClick={() => toggleSave(post.id)}
            >
              🔖 Сохранить
            </button>

            <button
              className="feed-open-route-btn"
              onClick={() => onOpenRoutes(post.city, post.routeId)}
            >
              Открыть
            </button>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="feed-page">

      <div
        style={{
          background: 'red',
          color: '#fff',
          padding: '14px',
          fontWeight: 700,
          marginBottom: 20,
          borderRadius: 12,
        }}
      >
        FEED PAGE TEST 123
      </div>

      <div className="feed-header">
        <h2>Лента</h2>
        <div className="feed-subtitle">
          Маршруты, достопримечательности и моменты в формате social travel feed
        </div>
      </div>

      <div className="feed-compose-card">
        <button className="feed-compose-main-btn" onClick={onCreateRoute}>
          Создать маршрут
        </button>
      </div>

      <div className="feed-list">
        {feedPosts.map(renderCard)}
      </div>
    </div>
  )
}

export default FeedPage