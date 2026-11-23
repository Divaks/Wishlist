import { useState } from 'react'
import { ActionFeedback } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { WishSummary } from '@/features/wishes/wish-summary'
import { useApiAction } from '@/hooks/use-api-action'
import { useAuth } from '@/hooks/use-auth'
import type { Group, WishItem } from '@/types/api'

export function GroupWishes({
  group,
  userId,
}: {
  group: Group
  userId: string
}) {
  const [selectedMember, setSelectedMember] = useState('')
  const memberId = group.members.some(
    (member) => member.userId === selectedMember,
  )
    ? selectedMember
    : ''
  const { api } = useAuth()
  const action = useApiAction('groups')
  const path = `/groups/${group.id}/wishes` as const

  return (
    <section className="min-w-0 space-y-4">
      <h2 className="section-title">Group wishes</h2>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="wishlist-owner">Wishlist owner</label>
        <select
          id="wishlist-owner"
          className="max-w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
          value={memberId}
          onChange={(event) => setSelectedMember(event.target.value)}
        >
          <option value="">All members</option>
          {group.members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.user.name || member.user.email}
            </option>
          ))}
        </select>
      </div>
      <ApiList<WishItem>
        key={memberId}
        path={memberId ? undefined : path}
        pagedPath={memberId ? `${path}/${memberId}` : `${path}/paged`}
        empty="No wishes here yet."
      >
        {(items) => (
          <ul className="card-grid">
            {items.map((wish) => (
              <li key={wish.id} className="item-card">
                <WishSummary wish={wish} />
                <p className="tag">
                  Wish by{' '}
                  {wish.user?.name ||
                    group.members.find(
                      (member) => member.userId === wish.userId,
                    )?.user.email ||
                    'a member'}
                </p>
                {wish.userId !== userId && (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    {wish.isReserved && (
                      <p className="tag tag-reserved">
                        {wish.reservedById === userId
                          ? 'Reserved by you'
                          : 'Reserved'}
                      </p>
                    )}
                    {(!wish.isReserved || wish.reservedById === userId) && (
                      <Button
                        variant={wish.isReserved ? 'outline' : 'default'}
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate(() =>
                            api<WishItem | void>(
                              `/wishlist/${wish.id}/reserve`,
                              {
                                method: wish.isReserved ? 'DELETE' : 'POST',
                              },
                            ),
                          )
                        }
                      >
                        {wish.isReserved
                          ? 'Cancel reservation'
                          : 'Reserve wish'}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </ApiList>
      <ActionFeedback action={action} />
    </section>
  )
}
