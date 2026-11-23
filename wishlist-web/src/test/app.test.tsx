import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { App } from '@/app/app'
import type { RegisterRequest, RegisterResponse } from '@/types/api'
import { mockAccessToken } from './mocks/handlers'
import { server } from './mocks/server'

it('signs in from the home page, restores the session, and signs out', async () => {
  const user = userEvent.setup()
  const app = render(<App />)

  expect(
    screen.getByRole('heading', { name: 'Share your gift wishlist' }),
  ).toBeVisible()
  await user.click(screen.getByRole('link', { name: 'Log in' }))
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'test-password')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(
    await screen.findByRole('heading', { name: 'Your Wishlist' }),
  ).toBeVisible()
  expect(localStorage.getItem('wishlist.accessToken')).toBe(mockAccessToken)

  await user.click(screen.getByRole('link', { name: 'View groups' }))
  expect(screen.getByRole('heading', { name: 'Groups' })).toBeVisible()
  app.unmount()
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Groups' })).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(window.location.pathname).toBe('/login')
  expect(localStorage.getItem('wishlist.accessToken')).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Wishlist' }))
  expect(
    screen.getByRole('heading', { name: 'Share your gift wishlist' }),
  ).toBeVisible()
})

it('validates registration, submits it, and prefills the login email', async () => {
  const email = 'new@example.com'
  let submitted: RegisterRequest | undefined
  server.use(
    http.post<never, RegisterRequest, RegisterResponse>(
      '*/api/auth/register',
      async ({ request }) => {
        submitted = await request.json()
        return HttpResponse.json(
          { id: 'new-user', email, name: null },
          { status: 201 },
        )
      },
    ),
  )
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('link', { name: 'Create an account' }))
  expect(
    screen.getByRole('heading', { name: 'Create an account' }),
  ).toBeVisible()
  const submit = screen.getByRole('button', { name: 'Create account' })

  await user.click(submit)
  expect(await screen.findByText('Enter a valid email address.')).toBeVisible()
  expect(screen.getByText('Use at least 8 characters.')).toBeVisible()
  expect(submitted).toBeUndefined()

  await user.type(screen.getByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Password'), 'test-password')
  await user.click(submit)

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('Account created.')
  expect(screen.getByLabelText('Email')).toHaveValue(email)
  expect(screen.getByLabelText('Password')).toHaveValue('')
  expect(submitted).toEqual({ email, password: 'test-password' })
})

it('shows a conflict message when the email is already registered', async () => {
  server.use(
    http.post(
      '*/api/auth/register',
      () => new HttpResponse(null, { status: 409 }),
    ),
  )
  const user = userEvent.setup()
  window.history.replaceState(null, '', '/register')
  render(<App />)
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'test-password')
  await user.click(screen.getByRole('button', { name: 'Create account' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'An account already uses this email.',
  )
  expect(window.location.pathname).toBe('/register')
})

it('requires login for protected pages and shows rejected credentials', async () => {
  server.use(
    http.post(
      '*/api/auth/login',
      () => new HttpResponse(null, { status: 401 }),
    ),
  )
  const user = userEvent.setup()
  window.history.replaceState(null, '', '/groups')
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeVisible()
  expect(window.location.pathname).toBe('/login')
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'wrong-password')
  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Email or password is incorrect.',
  )
  expect(window.location.pathname).toBe('/login')
  expect(localStorage.getItem('wishlist.accessToken')).toBeNull()
})
