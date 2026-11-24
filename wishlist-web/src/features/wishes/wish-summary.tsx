import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WishPhoto } from './wish-photo'
import type { WishItem } from '@/types/api'

function priceFormat(currency: WishItem['currency']) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

export function WishSummary({
  wish,
  titleLink,
  headerAction,
  ownerName,
  refreshPhoto,
  heading: Heading = 'h3',
}: {
  wish: WishItem
  titleLink?: string
  headerAction?: ReactNode
  ownerName?: string
  refreshPhoto: () => void
  heading?: 'h2' | 'h3'
}) {
  const link = wish.link && /^https?:\/\//i.test(wish.link) ? wish.link : null

  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
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
          {ownerName && (
            <p className="text-sm text-muted-foreground wrap-anywhere">
              Wish by {ownerName}
            </p>
          )}
        </div>
        {headerAction}
      </header>
      <WishPhoto wish={wish} refresh={refreshPhoto} />
      {wish.description && (
        <p className="text-sm leading-relaxed text-foreground/85 wrap-break-word">
          {wish.description}
        </p>
      )}
      <p className="text-2xl font-bold tabular-nums">
        <span className="mr-1 text-sm font-normal text-muted-foreground">
          Price
        </span>{' '}
        {priceFormat(wish.currency ?? 'UAH').format(wish.price)}
      </p>
      {Heading === 'h2' && (wish.isInCart || wish.occasion) && (
        <div className="flex flex-wrap gap-2">
          {wish.isInCart && <span className="tag">In cart</span>}
          {wish.occasion && (
            <span className="tag">
              {wish.occasion} {wish.occasionDate}
            </span>
          )}
        </div>
      )}
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
