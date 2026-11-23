import { Link } from 'react-router-dom'
import type { WishItem } from '@/types/api'

const prices = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

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
      <Heading className="font-display text-2xl leading-tight font-medium wrap-break-word">
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
        <p className="text-sm text-muted-foreground wrap-break-word">
          {wish.description}
        </p>
      )}
      <p className="font-semibold tabular-nums">
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
        <a className="text-link inline-block text-sm" href={link}>
          Product link
        </a>
      )}
    </div>
  )
}
