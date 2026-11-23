import { Link, useNavigate, useParams } from 'react-router-dom'
import { QueryContent } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { WishFeedback } from '@/features/wishes/wish-feedback'
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
    <div className="space-y-6">
      <h1 className="page-title">My wishes</h1>
      <WishFeedback action={action} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          <h2 className="section-title">Saved wishes</h2>
          <ApiList<WishItem> pagedPath="/wishlist/paged" empty="No wishes yet.">
            {(items) => (
              <ul className="card-grid">
                {items.map((wish) => (
                  <li key={wish.id} className="item-card">
                    <WishSummary wish={wish} titleLink={wish.id} />
                  </li>
                ))}
              </ul>
            )}
          </ApiList>
        </section>
        <section className="panel">
          <h2 className="section-title">New wish</h2>
          <WishForm
            disabled={action.isPending}
            onSave={(json) =>
              action.mutate(async () => {
                const wish = await api<WishItem>('/wishlist', {
                  method: 'POST',
                  json,
                })
                void navigate(`/wishlist/${wish.id}`, {
                  state: { wishNotice: 'created' },
                })
              })
            }
          />
        </section>
      </div>
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
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-link text-sm" to="/wishlist">
        Back to my wishes
      </Link>
      <h1 className="page-title">Wish details</h1>
      <WishFeedback action={action} />
      <QueryContent query={query}>
        {(wish) => (
          <div className="panel">
            <WishSummary wish={wish} heading="h2" />
            <hr className="my-5 border-border" />
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
                    void navigate('/wishlist', {
                      replace: true,
                      state: { wishNotice: 'deleted' },
                    })
                  })
              }}
            >
              Delete wish
            </Button>
          </div>
        )}
      </QueryContent>
    </div>
  )
}
