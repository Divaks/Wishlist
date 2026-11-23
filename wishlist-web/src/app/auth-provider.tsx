import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '@/app/auth-context'
import {
  requestApi,
  type ApiClient,
  type ApiPath,
  type ApiRequestOptions,
} from '@/lib/api/client'

// TODO: Migrate token storage to httpOnly cookies once backend supports cookie-based refresh/auth
const tokenKey = 'wishlist.accessToken'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setToken] = useState(() => localStorage.getItem(tokenKey))
  const currentToken = useRef(accessToken)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const setAccessToken = useCallback(
    (token: string | null) => {
      if (token === currentToken.current) return

      currentToken.current = token
      setToken(token)
      if (token === null) {
        localStorage.removeItem(tokenKey)
      } else {
        localStorage.setItem(tokenKey, token)
      }
      queryClient.clear()
    },
    [queryClient],
  )

  const api = useCallback<ApiClient>(
    function request<ResponseBody>(path: ApiPath, options?: ApiRequestOptions) {
      const requestToken = currentToken.current
      return requestApi<ResponseBody>(
        path,
        {
          accessToken: requestToken,
          onUnauthorized: () => {
            // A request from a previous session must not clear a newer token.
            if (requestToken !== currentToken.current) return
            setAccessToken(null)
            void navigate('/login', { replace: true })
          },
        },
        options,
      )
    },
    [navigate, setAccessToken],
  )

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, api }}>
      {children}
    </AuthContext.Provider>
  )
}
