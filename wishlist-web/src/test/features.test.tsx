import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it, vi } from 'vitest'
import { App } from '@/app/app'
import type {
  Group,
  GroupMember,
  Page,
  ProfileResponse,
  WishItem,
} from '@/types/api'
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
const ownerMembership: GroupMember = {
  id: 'membership-a',
  groupId: 'group-a',
  userId: owner.id,
  role: 'owner',
  user: owner,
  joinedAt: '2026-11-23T00:00:00Z',
}
const group: Group = {
  id: 'group-a',
  name: 'Gift group',
  description: null,
  createdById: owner.id,
  createdBy: owner,
  createdAt: '2026-11-23T00:00:00Z',
  members: [ownerMembership],
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

  expect(
    screen.queryByRole('checkbox', { name: 'Paginate' }),
  ).not.toBeInTheDocument()
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
    price: 1600,
    link: 'https://example.com/camera',
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
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [
          {
            ...wish,
            isReserved: reserved,
            reservedById: reserved ? profile.userId : null,
          },
        ],
        total: 1,
        page: 1,
        limit: 5,
        totalPages: 1,
      }),
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
  expect(await screen.findByText('Wish reserved')).toBeVisible()
  expect(screen.getByRole('link', { name: /View in store/ })).toHaveAttribute(
    'href',
    'https://example.com/camera',
  )
  expect(screen.getByRole('link', { name: /View in store/ })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  )
  expect(screen.getByText(/1\s600\s₴/)).toBeVisible()
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
  expect(await screen.findByText('Reservation cancelled')).toBeVisible()
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

it('shows notifications for wish creation, failed updates, successful updates and deletion', async () => {
  let failUpdate = true
  const wish: WishItem = {
    id: 'new-wish',
    title: 'A new camera',
    description: null,
    price: 0,
    link: null,
    priority: 'medium',
    isInCart: false,
    occasion: null,
    occasionDate: null,
    userId: profile.userId,
    user: null,
    isReserved: false,
    reservedById: null,
    reservedBy: null,
  }
  server.use(
    http.get('*/api/wishlist/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.post('*/api/wishlist', () => HttpResponse.json(wish, { status: 201 })),
    http.get('*/api/wishlist/new-wish', () => HttpResponse.json(wish)),
    http.patch('*/api/wishlist/new-wish', () =>
      failUpdate
        ? HttpResponse.json({ message: 'Please try again.' }, { status: 500 })
        : HttpResponse.json(wish),
    ),
    http.delete(
      '*/api/wishlist/new-wish',
      () => new HttpResponse(null, { status: 204 }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/wishlist')
  await user.type(screen.getByRole('textbox', { name: 'Title' }), wish.title)
  await user.click(screen.getByRole('button', { name: 'Create wish' }))
  expect(await screen.findByText('Wish created')).toBeVisible()
  expect(window.location.pathname).toBe('/wishlist/new-wish')
  await user.click(await screen.findByRole('button', { name: 'Save wish' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Please try again.',
  )
  failUpdate = false
  await user.click(await screen.findByRole('button', { name: 'Save wish' }))
  expect(await screen.findByText('Wish updated')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
  try {
    await user.click(screen.getByRole('button', { name: 'Delete wish' }))
    expect(await screen.findByText('Wish deleted')).toBeVisible()
    expect(window.location.pathname).toBe('/wishlist')
    expect(
      screen.queryByRole('button', { name: 'Dismiss' }),
    ).not.toBeInTheDocument()
  } finally {
    confirmation.mockRestore()
  }
})

it('shows a profile update notification', async () => {
  server.use(
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.patch('*/api/users/profile', () =>
      HttpResponse.json({ ...profile, id: profile.userId }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/profile')
  await user.click(await screen.findByRole('button', { name: 'Save profile' }))
  expect(await screen.findByText('Profile updated')).toBeVisible()
  expect(screen.queryByText('Done.')).not.toBeInTheDocument()
})

it('preserves the group creation notification after navigating to details', async () => {
  server.use(
    http.post('*/api/groups', () => HttpResponse.json(group, { status: 201 })),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups')
  await user.type(
    screen.getByRole('textbox', { name: 'Group name' }),
    'Gift group',
  )
  await user.click(screen.getByRole('button', { name: 'Create group' }))
  await waitFor(() => {
    expect(window.location.pathname).toBe('/groups/group-a')
    expect(screen.getByText('Group created')).toBeVisible()
  })
})

it('keeps group management in settings and opens invitations from the compact header', async () => {
  server.use(
    http.get('*/api/users/profile', () =>
      HttpResponse.json({ ...profile, userId: owner.id }),
    ),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  expect(
    await screen.findByRole('heading', { name: 'Group wishes' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Save group' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Delete group' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '+ Invite' }))
  expect(screen.getByRole('button', { name: 'Save group' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Delete group' })).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'Invite by email' })).toBeVisible()
  await waitFor(() =>
    expect(
      screen.getByRole('textbox', { name: 'Invite by email' }),
    ).toHaveFocus(),
  )
  expect(
    screen.queryByRole('heading', { name: 'Group wishes' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Wishes' }))
  expect(screen.getByRole('heading', { name: 'Group wishes' })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Save group' }),
  ).not.toBeInTheDocument()
})

it('filters group wishes with member chips and handles an API error', async () => {
  server.use(
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.get('*/api/groups/group-a/wishes/owner', ({ request }) => {
      expect(new URL(request.url).searchParams.get('page')).toBe('1')
      return HttpResponse.json(
        { message: 'Cannot load wishes.' },
        { status: 403 },
      )
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  await user.click(await screen.findByRole('button', { name: 'Owner' }))
  expect(screen.getByRole('button', { name: 'Owner' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Cannot load wishes.',
  )
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'All members' }))
  expect(await screen.findByText('No wishes here yet.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
})

it('keeps owner actions private and shows a notification after leaving a group', async () => {
  const leave = vi.fn(() => new HttpResponse(null, { status: 204 }))
  server.use(
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.delete('*/api/groups/group-a/leave', leave),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  await user.click(
    await screen.findByRole('button', { name: 'Members & Settings' }),
  )
  for (const name of [
    'Save group',
    'Delete group',
    'Send invitation',
    'Remove member',
    'Transfer ownership',
    '+ Invite',
  ]) {
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  }
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(false)
  try {
    await user.click(screen.getByRole('button', { name: 'Leave group' }))
    expect(leave).not.toHaveBeenCalled()
    confirmation.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Leave group' }))
    await waitFor(() => {
      expect(window.location.pathname).toBe('/groups')
      expect(screen.getByText('Group left')).toBeVisible()
    })
    expect(leave).toHaveBeenCalledTimes(1)
  } finally {
    confirmation.mockRestore()
  }
})

it('reports group edits and invitations, and updates permissions after ownership transfer', async () => {
  const member = {
    ...owner,
    id: profile.userId,
    email: profile.email,
    name: profile.name,
  }
  const managedGroup: Group = {
    ...group,
    members: [
      ...group.members,
      {
        ...ownerMembership,
        id: 'second-member',
        userId: member.id,
        user: member,
        role: 'member',
      },
    ],
  }
  server.use(
    http.get('*/api/users/profile', () =>
      HttpResponse.json({ ...profile, userId: owner.id }),
    ),
    http.get('*/api/groups/group-a', () => HttpResponse.json(managedGroup)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.patch('*/api/groups/group-a', () => HttpResponse.json(managedGroup)),
    http.post('*/api/groups/group-a/members', async ({ request }) => {
      expect(await request.json()).toEqual({ email: 'friend@example.com' })
      return HttpResponse.json({
        groupId: group.id,
        userId: 'friend',
        status: 'pending',
      })
    }),
    http.delete(
      '*/api/groups/group-a/members/viewer',
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.post('*/api/groups/group-a/members/viewer/transfer-ownership', () => {
      managedGroup.createdById = profile.userId
      managedGroup.members = managedGroup.members.map((member) => ({
        ...member,
        role: member.userId === profile.userId ? 'owner' : 'member',
      }))
      return new HttpResponse(null, { status: 204 })
    }),
    http.delete(
      '*/api/groups/group-a',
      () => new HttpResponse(null, { status: 204 }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  await user.click(
    await screen.findByRole('button', { name: 'Members & Settings' }),
  )
  await user.click(screen.getByRole('button', { name: 'Save group' }))
  expect(await screen.findByText('Group updated')).toBeVisible()
  await user.type(
    screen.getByRole('textbox', { name: 'Invite by email' }),
    'friend@example.com',
  )
  await user.click(screen.getByRole('button', { name: 'Send invitation' }))
  expect(await screen.findByText('Invitation sent')).toBeVisible()
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
  try {
    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }))
    expect(await screen.findByText('Ownership transferred')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Delete group' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Save group' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeVisible()
  } finally {
    confirmation.mockRestore()
  }
})

it('keeps failed wish creation on the form and displays the server error', async () => {
  server.use(
    http.get('*/api/wishlist/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.post('*/api/wishlist', () =>
      HttpResponse.json(
        { message: 'Cannot create this wish.' },
        { status: 400 },
      ),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/wishlist')
  await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Camera')
  await user.click(screen.getByRole('button', { name: 'Create wish' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Cannot create this wish.',
  )
  expect(window.location.pathname).toBe('/wishlist')
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Camera')
  expect(screen.getByRole('button', { name: 'Create wish' })).toBeEnabled()
})

it('deletes a group and shows its result on the group list', async () => {
  server.use(
    http.get('*/api/users/profile', () =>
      HttpResponse.json({ ...profile, userId: owner.id }),
    ),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.delete(
      '*/api/groups/group-a',
      () => new HttpResponse(null, { status: 204 }),
    ),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  await user.click(
    await screen.findByRole('button', { name: 'Members & Settings' }),
  )
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
  try {
    await user.click(screen.getByRole('button', { name: 'Delete group' }))
    await waitFor(() => {
      expect(window.location.pathname).toBe('/groups')
      expect(screen.getByText('Group deleted')).toBeVisible()
    })
  } finally {
    confirmation.mockRestore()
  }
})

it('accepts an invitation and displays the result on the group page', async () => {
  let pending = true
  server.use(
    http.get('*/api/groups/invitations', () =>
      HttpResponse.json(pending ? [{ groupId: group.id }] : []),
    ),
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.post('*/api/groups/group-a/invitations/accept', () => {
      pending = false
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups')
  await user.click(
    await screen.findByRole('button', { name: 'Accept invitation' }),
  )
  await waitFor(() => {
    expect(window.location.pathname).toBe('/groups/group-a')
    expect(screen.getByText('Invitation accepted')).toBeVisible()
  })
})

it('hides reservation actions for own wishes and reservations made by someone else', async () => {
  const base: WishItem = {
    id: 'own-wish',
    title: 'My gift',
    description: null,
    price: 20,
    link: null,
    priority: 'medium',
    isInCart: false,
    occasion: null,
    occasionDate: null,
    userId: profile.userId,
    user: null,
    isReserved: false,
    reservedById: null,
    reservedBy: null,
  }
  server.use(
    http.get('*/api/users/profile', () => HttpResponse.json(profile)),
    http.get('*/api/groups/group-a', () => HttpResponse.json(group)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [
          base,
          {
            ...base,
            id: 'someone-elses-wish',
            title: 'Reserved gift',
            userId: owner.id,
            isReserved: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 5,
        totalPages: 1,
      }),
    ),
  )
  openProtectedPage('/groups/group-a')
  expect(await screen.findByRole('heading', { name: 'My gift' })).toBeVisible()
  expect(screen.getByText('Reserved', { exact: true })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Reserve wish' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Cancel reservation' }),
  ).not.toBeInTheDocument()
})

it('removes a member and refreshes the group settings', async () => {
  const member = {
    ...owner,
    id: profile.userId,
    email: profile.email,
    name: profile.name,
  }
  const managedGroup: Group = {
    ...group,
    members: [
      ...group.members,
      {
        ...ownerMembership,
        id: 'second-member',
        userId: member.id,
        user: member,
        role: 'member',
      },
    ],
  }
  server.use(
    http.get('*/api/users/profile', () =>
      HttpResponse.json({ ...profile, userId: owner.id }),
    ),
    http.get('*/api/groups/group-a', () => HttpResponse.json(managedGroup)),
    http.get('*/api/groups/group-a/wishes/paged', () =>
      HttpResponse.json({
        data: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
      }),
    ),
    http.delete('*/api/groups/group-a/members/viewer', () => {
      managedGroup.members = [ownerMembership]
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/groups/group-a')
  await user.click(
    await screen.findByRole('button', { name: 'Members & Settings' }),
  )
  const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
  try {
    await user.click(screen.getByRole('button', { name: 'Remove member' }))
    expect(await screen.findByText('Member removed')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Remove member' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeVisible()
  } finally {
    confirmation.mockRestore()
  }
})
