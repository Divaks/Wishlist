import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ThemeToggle } from '@/components/theme-toggle'

function mockSystemTheme(dark: boolean) {
  const media = Object.assign(new EventTarget(), { matches: dark })
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  )
  return (matches: boolean) => {
    media.matches = matches
    media.dispatchEvent(Object.assign(new Event('change'), { matches }))
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('toggles the theme and restores the saved choice on remount', async () => {
  mockSystemTheme(false)
  const user = userEvent.setup()
  const { unmount } = render(<ThemeToggle />)
  expect(document.documentElement).not.toHaveClass('dark')
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
  expect(document.documentElement).toHaveClass('dark')
  expect(localStorage.getItem('wishlist.theme')).toBe('dark')
  unmount()
  render(<ThemeToggle />)
  expect(document.documentElement).toHaveClass('dark')
  await user.click(
    screen.getByRole('button', { name: 'Switch to light theme' }),
  )
  expect(document.documentElement).not.toHaveClass('dark')
  expect(localStorage.getItem('wishlist.theme')).toBe('light')
})

it('follows system theme changes until the user chooses a theme', async () => {
  const changeSystemTheme = mockSystemTheme(true)
  const user = userEvent.setup()
  render(<ThemeToggle />)
  expect(document.documentElement).toHaveClass('dark')
  act(() => changeSystemTheme(false))
  expect(document.documentElement).not.toHaveClass('dark')
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
  act(() => changeSystemTheme(true))
  act(() => changeSystemTheme(false))
  expect(document.documentElement).toHaveClass('dark')
})

it('prefers a saved light theme over a dark system theme', () => {
  mockSystemTheme(true)
  localStorage.setItem('wishlist.theme', 'light')
  render(<ThemeToggle />)
  expect(document.documentElement).not.toHaveClass('dark')
  expect(
    screen.getByRole('button', { name: 'Switch to dark theme' }),
  ).toBeVisible()
})

it('ignores an invalid saved theme and uses the system preference', () => {
  mockSystemTheme(true)
  localStorage.setItem('wishlist.theme', 'invalid')
  render(<ThemeToggle />)
  expect(document.documentElement).toHaveClass('dark')
})

it('can switch themes when browser storage is unavailable', async () => {
  mockSystemTheme(false)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable')
  })
  const user = userEvent.setup()
  render(<ThemeToggle />)
  await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
  expect(document.documentElement).toHaveClass('dark')
})
