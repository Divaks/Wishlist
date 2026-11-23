import type { WishItem } from '@/types/api'

export function WishSummary({ wish }: { wish: WishItem }) {
  const link = wish.link && /^https?:\/\//i.test(wish.link) ? wish.link : null

  return (
    <div className="space-y-1">
      <h3 className="font-semibold">{wish.title}</h3>
      {wish.description && <p>{wish.description}</p>}
      <p>
        Price: {wish.price} · Priority: {wish.priority}
        {wish.isInCart && ' · In cart'}
      </p>
      {link && (
        <a className="underline" href={link}>
          Product link
        </a>
      )}
      {wish.occasion && (
        <p>
          Occasion: {wish.occasion} {wish.occasionDate}
        </p>
      )}
    </div>
  )
}
