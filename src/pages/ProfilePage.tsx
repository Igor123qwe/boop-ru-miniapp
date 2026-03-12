import React, { useEffect, useMemo, useState } from 'react'
import type { SocialPost } from '../data/socialFeed'
import { readFeed, readLikedPostIds, readSavedPostIds } from '../utils/socialStorage'
import './ProfilePage.css'

export const ProfilePage: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [likedIds, setLikedIds] = useState<string[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])

  useEffect(() => {
    setPosts(readFeed())
    setLikedIds(readLikedPostIds())
    setSavedIds(readSavedPostIds())
  }, [])

  const myPosts = useMemo(() => {
    return posts.filter(post => post.authorId === 'local-user')
  }, [posts])

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">И</div>
        <div className="profile-name">Игорь</div>
        <div className="profile-subtitle">Путешественник и автор маршрутов</div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat-card">
          <div className="profile-stat-value">{myPosts.length}</div>
          <div className="profile-stat-label">Публикаций</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-value">{savedIds.length}</div>
          <div className="profile-stat-label">Сохранено</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-value">{likedIds.length}</div>
          <div className="profile-stat-label">Лайков</div>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-title">Мои публикации</div>

        <div className="profile-posts">
          {myPosts.length === 0 && (
            <div className="profile-empty">
              Пока нет публикаций. Следующим шагом добавим кнопку “Опубликовать маршрут”.
            </div>
          )}

          {myPosts.map(post => (
            <div key={post.id} className="profile-post-card">
              <div className="profile-post-title">{post.title}</div>
              <div className="profile-post-meta">
                {post.city} · {post.type === 'route' ? 'Маршрут' : 'Место'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}