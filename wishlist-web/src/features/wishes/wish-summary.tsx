import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { WishItem } from '@/types/api'

const prices = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'UAH',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

export function WishSummary({
  wish,
  titleLink,
  heading: Heading = 'h3',
}: {
  wish: WishItem
  titleLink?: string
  heading?: 'h2' | 'h3'
}) {
  const link = wish.link && /^https?:\/\//i.test(wish.link) ? wish.link : null

  return (
    <div className="space-y-3">
      <div
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-xl bg-secondary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-6"
        >
          <path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" />
        </svg>
      </div>
      <Heading className="text-xl leading-tight font-semibold wrap-break-word">
        {titleLink ? (
          <Link
            className="underline decoration-border underline-offset-4 hover:decoration-ring"
            to={titleLink}
          >
            {wish.title}
          </Link>
        ) : (
          wish.title
        )}
      </Heading>
      {wish.description && (
        <p className="text-sm leading-relaxed text-foreground/85 wrap-break-word">
          {wish.description}
        </p>
      )}
      <p className="text-2xl font-bold tabular-nums">
        <span className="mr-1 text-sm font-normal text-muted-foreground">
          Price
        </span>{' '}
        {prices.format(wish.price)}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className="tag capitalize">{wish.priority} priority</span>
        {wish.isInCart && <span className="tag">In cart</span>}
        {wish.occasion && (
          <span className="tag">
            {wish.occasion} {wish.occasionDate}
          </span>
        )}
      </div>
      {link && (
        <Button asChild variant="outline" className="w-full">
          <a href={link} target="_blank" rel="noopener noreferrer">
            View in store
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
            </svg>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      )}
    </div>
  )
}
