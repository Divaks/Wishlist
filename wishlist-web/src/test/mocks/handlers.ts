import { http, HttpResponse } from 'msw'
import type { LoginResponse, Group, Page } from '@/types/api'

export const mockAccessToken = 'mock-access-token'

export const handlers = [
  http.post('*/api/auth/login', () =>
    HttpResponse.json<LoginResponse>(
      { accessToken: mockAccessToken },
      { status: 201 },
    ),
  ),
  http.get('*/api/groups/invitations', () => HttpResponse.json([])),
  http.get('*/api/groups', ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${mockAccessToken}`) {
      return new HttpResponse(null, { status: 401 })
    }
    return HttpResponse.json([])
  }),
  http.get('*/api/groups/paged', ({ request }) => {
    if (request.headers.get('Authorization') !== `Bearer ${mockAccessToken}`) {
      return new HttpResponse(null, { status: 401 })
    }
    return HttpResponse.json<Page<Group>>({
      data: [],
      total: 0,
      page: 1,
      limit: 5,
      totalPages: 0,
    })
  }),
]
