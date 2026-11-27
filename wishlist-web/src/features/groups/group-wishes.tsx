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
  const [successMessage, setSuccessMessage] = useState('Reservation updated')
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
      <div
        aria-label="Wishlist owner"
        className="flex gap-2 overflow-x-auto pb-2"
      >
        <Button
          variant={memberId === '' ? 'default' : 'outline'}
          aria-pressed={memberId === ''}
          onClick={() => setSelectedMember('')}
        >
          All members
        </Button>
        {group.members.map((member) => (
          <Button
            key={member.userId}
            variant={memberId === member.userId ? 'default' : 'outline'}
            aria-pressed={memberId === member.userId}
            onClick={() => setSelectedMember(member.userId)}
          >
            {member.user.name || member.user.email}
          </Button>
        ))}
      </div>
      <ApiList<WishItem>
        key={memberId}
        pagedPath={memberId ? `${path}/${memberId}` : `${path}/paged`}
        empty="No wishes here yet."
      >
        {(items, refreshPhoto) => (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((wish) => (
              <li key={wish.id} className="item-card flex flex-col">
                <WishSummary
                  wish={wish}
                  refreshPhoto={refreshPhoto}
                  ownerName={
                    wish.user?.name ||
                    group.members.find(
                      (member) => member.userId === wish.userId,
                    )?.user.email ||
                    'a member'
                  }
                />
                {wish.userId !== userId && (
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t pt-3">
                    {wish.isReserved && (
                      <p className="tag tag-reserved">
                        {wish.reservedById === userId
                          ? 'Reserved by you'
                          : 'Reserved'}
                      </p>
                    )}
                    {(!wish.isReserved || wish.reservedById === userId) && (
                      <Button
                        variant={wish.isReserved ? 'ghost' : 'default'}
                        className={
                          wish.isReserved
                            ? 'hover:bg-destructive/10 hover:text-destructive'
                            : undefined
                        }
                        disabled={action.isPending}
                        onClick={() => {
                          setSuccessMessage(
                            wish.isReserved
                              ? 'Reservation cancelled'
                              : 'Wish reserved',
                          )
                          action.mutate(() =>
                            api<WishItem | void>(
                              `/wishlist/${wish.id}/reserve`,
                              {
                                method: wish.isReserved ? 'DELETE' : 'POST',
                              },
                            ),
                          )
                        }}
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
      <ActionFeedback action={action} successMessage={successMessage} />
    </section>
  )
}
