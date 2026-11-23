import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it, vi } from 'vitest'
import { App } from '@/app/app'
import type { Group, Page, ProfileResponse, WishItem } from '@/types/api'
import { mockAccessToken } from './mocks/handlers'
import { server } from './mocks/server'

const profile: ProfileResponse = {
  userId: 'viewer',
  email: 'viewer@example.com',
  name: 'Viewer',
  birthday: null,
}

const owner = {
  id: 'owner',
  email: 'owner@example.com',
  name: 'Owner',
  birthday: null,
}
const group: Group = {
  id: 'group-a',
  name: 'Gift group',
  description: null,
  createdById: owner.id,
  createdBy: owner,
  createdAt: '2026-11-23T00:00:00Z',
  members: [
    {
      id: 'membership-a',
      groupId: 'group-a',
      userId: owner.id,
      role: 'owner',
      user: owner,
      joinedAt: '2026-11-23T00:00:00Z',
    },
  ],
}

function openProtectedPage(path: string) {
  localStorage.setItem('wishlist.accessToken', mockAccessToken)
  window.history.replaceState(null, '', path)
  render(<App />)
}

it('shows the health response through the API proxy', async () => {
  server.use(
    http.get('*/api/health', () =>
      HttpResponse.json({ status: 'ok', timestamp: 'test-time' }),
    ),
  )
  window.history.replaceState(null, '', '/connection')
  render(<App />)

  expect(await screen.findByText('Health status: ok (test-time)')).toBeVisible()
})

it('sends page and limit for the paged groups route and handles moving to the next page', async () => {
  server.use(
    http.get('*/api/groups/paged', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page'))
      const limit = Number(url.searchParams.get('limit'))
      expect(limit).toBe(5)
      return HttpResponse.json<Page<Group>>({
        page,
        limit,
        total: 6,
        totalPages: 2,
        data: page === 2 ? [group] : [],
      })
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups')

  await user.click(screen.getByRole('checkbox', { name: 'Paginate' }))
  expect(await screen.findByText('Page 1 of 2')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByRole('link', { name: 'Gift group' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})

it('refreshes group wishes after reserve and cancel, with permissions based on the current user', async () => {
  let reserved = false
  const wish: WishItem = {
    id: 'wish-a',
    title: 'A camera',
    description: null,
    price: 20,
    link: null,
    priority: 'medium',
    isInCart: false,
    occasion: null,
    occasionDate: null,
    userId: owner.id,
    user: owner,
    isReserved: false,
    reservedById: null,
    reservedBy: null,
  }
  server.use(
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes', () =>
      HttpResponse.json([
        {
          ...wish,
          isReserved: reserved,
          reservedById: reserved ? profile.userId : null,
        },
      ]),
    ),
    http.post('*/api/wishlist/wish-a/reserve', ({ request }) => {
      expect(request.headers.get('Authorization')).toBe(
        `Bearer ${mockAccessToken}`,
      )
      reserved = true
      return HttpResponse.json(wish, { status: 201 })
    }),
    http.delete('*/api/wishlist/wish-a/reserve', () => {
      reserved = false
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')

  expect(
    await screen.findByRole('heading', { name: 'Gift group' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Save group' }),
  ).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Reserve wish' }))
  expect(await screen.findByText('Reserved by you')).toBeVisible()
  const wishCard = screen
    .getByRole('heading', { name: 'A camera' })
    .closest('li')
  if (!wishCard) throw new Error('Expected wish in the list')
  await user.click(
    within(wishCard).getByRole('button', { name: 'Cancel reservation' }),
  )
  expect(
    await screen.findByRole('button', { name: 'Reserve wish' }),
  ).toBeVisible()
})

it('shows the backend conflict message and keeps the session when account deletion fails', async () => {
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
  try {
    server.use(
      http.get('*/api/users/profile', () => HttpResponse.json(profile)),
      http.delete('*/api/users/account', () =>
        HttpResponse.json(
          {
            message:
              'Transfer or delete your groups before deleting your account',
          },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    openProtectedPage('/profile')
    await user.click(
      await screen.findByRole('button', { name: 'Delete account' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Transfer or delete your groups',
    )
    expect(localStorage.getItem('wishlist.accessToken')).toBe(mockAccessToken)
  } finally {
    confirmation.mockRestore()
  }
})
