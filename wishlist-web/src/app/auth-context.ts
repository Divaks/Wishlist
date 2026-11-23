import { createContext } from 'react'
import type { ApiClient } from '@/lib/api/client'

interface AuthContextValue {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  api: ApiClient
}

export const AuthContext = createContext<AuthContextValue | null>(null)
