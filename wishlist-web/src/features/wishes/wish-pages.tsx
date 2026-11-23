import { Link, useNavigate, useParams } from 'react-router-dom'
import { ActionFeedback, QueryContent } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { WishForm } from '@/features/wishes/wish-form'
import { WishSummary } from '@/features/wishes/wish-summary'
import { useApiAction } from '@/hooks/use-api-action'
import { useApiQuery } from '@/hooks/use-api-query'
import { useAuth } from '@/hooks/use-auth'
import type { WishItem } from '@/types/api'

export function WishlistPage() {
  const { api } = useAuth()
  const navigate = useNavigate()
  const action = useApiAction('wishlist', 'groups')

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">My wishes</h1>
      <section className="space-y-3">
        <h2 className="font-semibold">New wish</h2>
        <WishForm
          disabled={action.isPending}
          onSave={(json) =>
            action.mutate(async () => {
              const wish = await api<WishItem>('/wishlist', {
                method: 'POST',
                json,
              })
              void navigate(`/wishlist/${wish.id}`)
            })
          }
        />
        <ActionFeedback action={action} />
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Saved wishes</h2>
        <ApiList<WishItem>
          path="/wishlist"
          pagedPath="/wishlist/paged"
          empty="No wishes yet."
        >
          {(items) => (
            <ul className="space-y-3">
              {items.map((wish) => (
                <li key={wish.id}>
                  <Link className="underline" to={wish.id}>
                    {wish.title}
                  </Link>{' '}
                  · {wish.price}
                </li>
              ))}
            </ul>
          )}
        </ApiList>
      </section>
    </div>
  )
}

export function WishPage() {
  const { wishId } = useParams()
  const id = encodeURIComponent(wishId ?? '')
  const query = useApiQuery<WishItem>(`/wishlist/${id}`)
  const { api } = useAuth()
  const navigate = useNavigate()
  const action = useApiAction('wishlist', 'groups')

  return (
    <div className="space-y-4">
      <Link className="underline" to="/wishlist">
        Back to my wishes
      </Link>
      <h1 className="text-xl font-semibold">Wish details</h1>
      <QueryContent query={query}>
        {(wish) => (
          <>
            <WishSummary wish={wish} />
            <WishForm
              key={wish.id}
              wish={wish}
              disabled={action.isPending}
              onSave={(json) =>
                action.mutate(() =>
                  api<WishItem>(`/wishlist/${id}`, { method: 'PATCH', json }),
                )
              }
            />
            <Button
              variant="destructive"
              disabled={action.isPending}
              onClick={() => {
                if (window.confirm('Delete this wish?'))
                  action.mutate(async () => {
                    await api<void>(`/wishlist/${id}`, { method: 'DELETE' })
                    void navigate('/wishlist', { replace: true })
                  })
              }}
            >
              Delete wish
            </Button>
          </>
        )}
      </QueryContent>
      <ActionFeedback action={action} />
    </div>
  )
}
