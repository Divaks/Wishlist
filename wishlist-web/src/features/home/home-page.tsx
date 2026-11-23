import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import giftBoxes from '@/assets/gift-boxes.webp'

export function HomePage() {
  const { accessToken } = useAuth()

  return (
    <section className="grid overflow-hidden rounded-3xl border bg-card lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14 lg:min-h-[34rem] lg:px-14">
        <h1 className="max-w-[12ch] font-display text-[clamp(3rem,6vw,5.75rem)] leading-[0.98] font-medium tracking-[-0.055em] text-balance">
          {accessToken ? 'Your Wishlist' : 'Share your gift wishlist'}
        </h1>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground sm:text-lg">
          {accessToken
            ? 'Find gift ideas in your groups or add a wish of your own.'
            : 'Keep gift ideas in one place, share them with friends and family, and reserve the gifts you plan to give.'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {accessToken ? (
            <>
              <Button asChild size="lg">
                <Link to="/groups">View groups</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/wishlist">Open my wishes</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link to="/register">Create an account</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="relative min-h-60 bg-secondary sm:min-h-80">
        <img
          src={giftBoxes}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-center"
        />
      </div>
    </section>
  )
}
