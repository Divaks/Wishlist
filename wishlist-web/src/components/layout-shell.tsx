import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

const accountLinks = [
  { to: '/wishlist', label: 'My wishes' },
  { to: '/groups', label: 'Groups' },
  { to: '/profile', label: 'Profile' },
]

export function LayoutShell() {
  const { accessToken, setAccessToken } = useAuth()
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-10 focus:rounded-md focus:bg-card focus:p-3"
        href="#main"
      >
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="site-container flex min-h-20 flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight"
          >
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-box" />
            </span>
            Wishlist
          </Link>
          {accessToken ? (
            <>
              <nav
                aria-label="Main"
                className="order-last flex w-full flex-wrap items-center gap-1 sm:order-0 sm:w-auto"
              >
                {accountLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-secondary ${isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </>
          ) : null}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {accessToken ? (
              <Button variant="outline" onClick={() => setAccessToken(null)}>
                Sign out
              </Button>
            ) : !isAuthPage ? (
              <Button asChild variant="outline">
                <Link to="/login">Log in</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="site-container grow py-8 sm:py-12"
      >
        <Outlet />
      </main>
      <footer className="border-t">
        <div className="site-container flex flex-wrap items-center justify-between gap-4 py-5 text-sm text-muted-foreground">
          <span className="font-display text-base font-medium text-foreground">
            Wishlist
          </span>
          <Link className="hover:underline" to="/connection">
            API connection
          </Link>
        </div>
      </footer>
    </div>
  )
}
