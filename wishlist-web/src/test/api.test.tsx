import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import { AuthProvider } from '@/app/auth-provider'
import { useAuth } from '@/hooks/use-auth'
import { AppRoutes } from '@/routes/app-routes'
import type {
  ListGroupsResponse,
  LoginRequest,
  LoginResponse,
} from '@/types/api'
import { mockAccessToken } from './mocks/handlers'
import { server } from './mocks/server'

function CurrentPath() {
  return <output>{useLocation().pathname}</output>
}

it('accepts a 201 login, sends the bearer token, and logs out on 401', async () => {
  const queryClient = new QueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/register']}>
          <AuthProvider>
            {children}
            <AppRoutes />
            <CurrentPath />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  const { result } = renderHook(useAuth, { wrapper: Wrapper })
  const credentials: LoginRequest = {
    email: 'test@example.com',
    password: 'test-password',
  }
  const { accessToken } = await result.current.api<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      json: credentials,
    },
  )
  expect(accessToken).toBe(mockAccessToken)

  act(() => result.current.setAccessToken(accessToken))
  expect(localStorage.getItem('wishlist.accessToken')).toBe(mockAccessToken)
  await expect(
    result.current.api<ListGroupsResponse>('/groups'),
  ).resolves.toEqual([])

  server.use(
    http.get('*/api/groups', () => new HttpResponse(null, { status: 401 })),
  )

  await act(async () => {
    await expect(result.current.api('/groups')).rejects.toMatchObject({
      status: 401,
    })
  })
  expect(result.current.accessToken).toBeNull()
  expect(localStorage.getItem('wishlist.accessToken')).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('/login')
  expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})
