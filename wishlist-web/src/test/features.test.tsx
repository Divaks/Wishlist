import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
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
    currency: 'UAH',
    link: 'https://example.com/camera',
    photoUrl: 'https://photos.example.com/group-camera?signature=group',
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
  expect(
    await screen.findByRole('img', { name: 'Photo of A camera' }),
  ).toHaveAttribute('src', wish.photoUrl)
  const heading = screen.getByRole('heading', { name: wish.title })
  const image = screen.getByRole('img', { name: `Photo of ${wish.title}` })
  const store = screen.getByRole('link', { name: /View in store/ })
  const reserve = screen.getByRole('button', { name: 'Reserve wish' })
  expect(heading.compareDocumentPosition(image)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(image.compareDocumentPosition(store)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(store.compareDocumentPosition(reserve)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  await user.click(reserve)
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
  let saved = false
  const wish: WishItem = {
    id: 'new-wish',
    title: 'A new camera',
    description: null,
    price: 12,
    currency: 'EUR',
    link: null,
    photoUrl: null,
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
        data: saved ? [wish] : [],
        total: Number(saved),
        page: 1,
        limit: 5,
        totalPages: Number(saved),
      }),
    ),
    http.post('*/api/wishlist', async ({ request }) => {
      const json: unknown = await request.json()
      expect(json).toMatchObject({ currency: 'EUR', price: 12 })
      expect(json).not.toHaveProperty('priority')
      saved = true
      return HttpResponse.json(wish, { status: 201 })
    }),
    http.get('*/api/wishlist/new-wish', () => HttpResponse.json(wish)),
    http.patch('*/api/wishlist/new-wish', () =>
      failUpdate
        ? HttpResponse.json({ message: 'Please try again.' }, { status: 500 })
        : HttpResponse.json(wish),
    ),
    http.delete('*/api/wishlist/new-wish', () => {
      saved = false
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  openProtectedPage('/wishlist')
  await user.type(screen.getByRole('textbox', { name: 'Title' }), wish.title)
  await user.clear(screen.getByRole('spinbutton', { name: 'Price' }))
  await user.type(screen.getByRole('spinbutton', { name: 'Price' }), '12')
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Currency' }),
    'EUR',
  )
  expect(
    screen.queryByRole('combobox', { name: 'Priority' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Create wish' }))
  expect(await screen.findByText('Wish created')).toBeVisible()
  expect(window.location.pathname).toBe('/wishlist')
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('')
  expect(await screen.findByText(/12\s€/)).toBeVisible()
  const title = await screen.findByRole('heading', { name: wish.title })
  const deleteButton = screen.getByRole('button', {
    name: `Delete ${wish.title}`,
  })
  expect(title.closest('header')).toContainElement(deleteButton)
  expect(deleteButton.textContent).toBe('')
  expect(screen.queryByText('medium priority')).not.toBeInTheDocument()

  await user.click(await screen.findByRole('link', { name: wish.title }))
  expect(await screen.findByRole('combobox', { name: 'Currency' })).toHaveValue(
    'EUR',
  )
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
    await user.click(screen.getByRole('link', { name: 'Back to my wishes' }))
    await user.click(
      await screen.findByRole('button', { name: `Delete ${wish.title}` }),
    )
    expect(await screen.findByText('No wishes yet.')).toBeVisible()
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
    currency: 'UAH',
    link: null,
    photoUrl: null,
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

it('keeps the saved wish after a failed photo upload and retries without creating another', async () => {
  const wish: WishItem = {
    id: 'photo-wish',
    title: 'A camera with photo',
    description: null,
    price: 0,
    currency: 'UAH',
    link: null,
    photoUrl: null,
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
  let creations = 0
  let uploads = 0
  const initialUrl = 'https://photos.example.com/camera?signature=initial'
  const refreshedUrl = 'https://photos.example.com/camera?signature=refreshed'
  const replacedUrl = 'https://photos.example.com/replacement?signature=initial'
  server.use(
    http.get('*/api/wishlist/paged', () =>
      HttpResponse.json({
        data: creations ? [wish] : [],
        total: creations,
        page: 1,
        limit: 5,
        totalPages: creations,
      }),
    ),
    http.post('*/api/wishlist', async ({ request }) => {
      expect(await request.json()).toMatchObject({ title: wish.title })
      creations += 1
      return HttpResponse.json(wish, { status: 201 })
    }),
    http.put('*/api/wishlist/photo-wish/photo', async ({ request }) => {
      expect(request.headers.get('Authorization')).toBe(
        `Bearer ${mockAccessToken}`,
      )
      const upload = (await request.formData()).get('photo')
      expect(upload).toMatchObject({ size: 10, type: 'image/png' })
      uploads += 1
      if (uploads === 1) {
        return HttpResponse.json({ message: 'Try again.' }, { status: 503 })
      }
      wish.photoUrl = uploads === 2 ? initialUrl : replacedUrl
      return new HttpResponse(null, { status: 204 })
    }),
    http.get('*/api/wishlist/photo-wish', () => HttpResponse.json(wish)),
    http.delete('*/api/wishlist/photo-wish/photo', () => {
      wish.photoUrl = null
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  const photo = new File(['test bytes'], 'camera.png', { type: 'image/png' })
  openProtectedPage('/wishlist')
  await user.type(screen.getByRole('textbox', { name: 'Title' }), wish.title)
  await user.upload(screen.getByLabelText('Wish photo (optional)'), photo)
  expect(screen.getByAltText('Selected photo preview')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Create wish' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Wish saved. Photo upload failed.',
  )
  expect(await screen.findByRole('link', { name: wish.title })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Create wish' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Retry photo upload' }))
  const imageName = `Photo of ${wish.title}`
  const image = await screen.findByRole('img', { name: imageName })
  expect(image).toHaveAttribute('src', initialUrl)
  expect(creations).toBe(1)
  expect(uploads).toBe(2)
  expect(window.location.pathname).toBe('/wishlist')
  await user.click(screen.getByRole('link', { name: wish.title }))
  const detailImage = await screen.findByRole('img', { name: imageName })

  wish.photoUrl = refreshedUrl
  fireEvent.error(detailImage)
  expect(screen.queryByRole('img', { name: imageName })).not.toBeInTheDocument()
  const refreshed = await screen.findByRole('img', { name: imageName })
  expect(refreshed).toHaveAttribute('src', refreshedUrl)
  fireEvent.error(refreshed)
  expect(screen.queryByRole('img', { name: imageName })).not.toBeInTheDocument()

  await user.upload(screen.getByLabelText('Choose a replacement photo'), photo)
  await user.click(screen.getByRole('button', { name: 'Replace photo' }))
  expect(await screen.findByRole('img', { name: imageName })).toHaveAttribute(
    'src',
    replacedUrl,
  )
  await user.click(screen.getByRole('button', { name: 'Remove photo' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('img', { name: imageName }),
    ).not.toBeInTheDocument(),
  )
  await user.click(screen.getByRole('link', { name: 'Back to my wishes' }))
  expect(await screen.findByRole('link', { name: wish.title })).toBeVisible()
  expect(screen.queryByRole('img', { name: imageName })).not.toBeInTheDocument()
})
