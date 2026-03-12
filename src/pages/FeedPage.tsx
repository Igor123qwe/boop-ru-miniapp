import React, { useEffect, useMemo, useState } from 'react'
import type { SocialPost } from '../data/socialFeed'
import {
  readFeed,
  readLikedPostIds,
  readSavedPostIds,
  writeFeed,
  writeLikedPostIds,
  writeSavedPostIds,
} from '../utils/socialStorage'
import './FeedPage.css'

type Props = {
  onOpenRoutes: (city: string) => void
}

export const FeedPage: React.FC<Props> = ({ onOpenRoutes }) => {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    setPosts(readFeed())
    setLikedIds(readLikedPostIds())
    setSavedIds(readSavedPostIds())
  }, [])

  const sortedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [posts])

  const toggleLike = (postId: string) => {
    const isLiked = likedIds.includes(postId)
    const nextLikedIds = isLiked
      ? likedIds.filter(id => id !== postId)
      : [...likedIds, postId]

    const nextPosts = posts.map(post => {
      if (post.id !== postId) return post
      return {
        ...post,
        likes: isLiked ? Math.max(0, post.likes - 1) : post.likes + 1,
      }
    })

    setLikedIds(nextLikedIds)
    setPosts(nextPosts)
    writeLikedPostIds(nextLikedIds)
    writeFeed(nextPosts)
  }

  const toggleSave = (postId: string) => {
    const isSaved = savedIds.includes(postId)
    const nextSavedIds = isSaved
      ? savedIds.filter(id => id !== postId)
      : [...savedIds, postId]

    setSavedIds(nextSavedIds)
    writeSavedPostIds(nextSavedIds)
  }

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h2>Лента</h2>
        <div className="feed-subtitle">
          Места и маршруты, которыми делятся пользователи
        </div>
      </div>

      <div className="feed-list">
        {sortedPosts.map(post => {
          const isLiked = likedIds.includes(post.id)
          const isSaved = savedIds.includes(post.id)

          return (
            <div key={post.id} className="feed-card">
              <img
                src={post.image}
                alt={post.title}
                className="feed-image"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />

              <div className="feed-content">
                <div className="feed-topline">
                  <span className="feed-type">
                    {post.type === 'route' ? 'Маршрут' : 'Место'}
                  </span>
                  <span className="feed-city-tag">{post.city}</span>
                </div>

                <div className="feed-title">{post.title}</div>

                {post.description && (
                  <div className="feed-description">{post.description}</div>
                )}

                <div className="feed-author">@{post.author}</div>

                <div className="feed-actions">
                  <button
                    type="button"
                    className={isLiked ? 'feed-action-btn active' : 'feed-action-btn'}
                    onClick={() => toggleLike(post.id)}
                  >
                    ❤️ {post.likes}
                  </button>

                  <button
                    type="button"
                    className={isSaved ? 'feed-action-btn active' : 'feed-action-btn'}
                    onClick={() => toggleSave(post.id)}
                  >
                    🔖 {isSaved ? 'Сохранено' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    className="feed-action-btn"
                    onClick={() => onOpenRoutes(post.city)}
                  >
                    Открыть
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}