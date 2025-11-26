import { useEffect, useState } from 'react'
import { getTelegramWebApp, TelegramWebApp } from '../telegram'
import type { TelegramUser } from '../types'

interface UseTelegramWebAppResult {
  tg: TelegramWebApp | null
  tgUser: TelegramUser | null
  isReady: boolean
}

export const useTelegramWebApp = (): UseTelegramWebAppResult => {
  const [tg, setTg] = useState<TelegramWebApp | null>(null)
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const webApp = getTelegramWebApp()
    if (!webApp) {
      console.warn('Telegram WebApp not found. Running in browser mode.')
      setIsReady(true)
      return
    }

    webApp.ready()
    webApp.expand()
    setTg(webApp)

    const user = webApp.initDataUnsafe?.user
    if (user) {
      setTgUser({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        language_code: user.language_code,
      })
    }
    setIsReady(true)
  }, [])

  return { tg, tgUser, isReady }
}
