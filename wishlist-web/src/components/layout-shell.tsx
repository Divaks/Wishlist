import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function LayoutShell() {
  const { accessToken, setAccessToken } = useAuth()

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Wishlist
          </Link>
          {accessToken && (
            <Button variant="outline" onClick={() => setAccessToken(null)}>
              Sign out
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </>
  )
}
