import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function HomePage() {
  const { accessToken } = useAuth()

  return (
    <section className="rounded-xl border bg-muted px-6 py-12 sm:px-12 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {accessToken ? 'Your Wishlist' : 'Share your gift wishlist'}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
        {accessToken
          ? 'Open your groups to find wishlists shared by friends and family.'
          : 'Share gift ideas with friends and family and reserve gifts for each other.'}
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        {accessToken ? (
          <Button asChild size="lg">
            <Link to="/groups">View groups</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link to="/register">Create an account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
