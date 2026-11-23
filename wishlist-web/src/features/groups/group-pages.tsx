import { Link, useNavigate, useParams } from 'react-router-dom'
import { ActionFeedback, QueryContent } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { GroupForm } from '@/features/groups/group-form'
import { GroupWishes } from '@/features/groups/group-wishes'
import { InviteForm } from '@/features/groups/invite-form'
import { useApiAction } from '@/hooks/use-api-action'
import { useApiQuery } from '@/hooks/use-api-query'
import { useAuth } from '@/hooks/use-auth'
import type {
  Group,
  GroupInvitation,
  InviteMemberResponse,
  ProfileResponse,
} from '@/types/api'

export function GroupsPage() {
  const { api } = useAuth()
  const navigate = useNavigate()
  const create = useApiAction('groups')
  const accept = useApiAction('groups')
  const invitations = useApiQuery<GroupInvitation[]>('/groups/invitations')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Groups</h1>
      <section className="space-y-3">
        <h2 className="font-semibold">New group</h2>
        <GroupForm
          disabled={create.isPending}
          onSave={(json) =>
            create.mutate(async () => {
              const group = await api<Group>('/groups', {
                method: 'POST',
                json,
              })
              void navigate(`/groups/${group.id}`)
            })
          }
        />
        <ActionFeedback action={create} />
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Invitations</h2>
        <QueryContent query={invitations}>
          {(items) =>
            items.length ? (
              <ul className="space-y-2">
                {items.map(({ groupId }) => (
                  <li
                    key={groupId}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span>Group {groupId}</span>
                    <Button
                      variant="outline"
                      disabled={accept.isPending}
                      onClick={() =>
                        accept.mutate(async () => {
                          await api<void>(
                            `/groups/${groupId}/invitations/accept`,
                            { method: 'POST' },
                          )
                          void navigate(`/groups/${groupId}`)
                        })
                      }
                    >
                      Accept invitation
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pending invitations.</p>
            )
          }
        </QueryContent>
        <ActionFeedback action={accept} />
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">My groups</h2>
        <ApiList<Group>
          path="/groups"
          pagedPath="/groups/paged"
          empty="No groups yet."
        >
          {(items) => (
            <ul className="space-y-2">
              {items.map((group) => (
                <li key={group.id}>
                  <Link className="underline" to={group.id}>
                    {group.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ApiList>
      </section>
    </div>
  )
}

function GroupDetails({ group, userId }: { group: Group; userId: string }) {
  const { api } = useAuth()
  const navigate = useNavigate()
  const action = useApiAction('groups')
  const isOwner = group.createdById === userId
  const path = `/groups/${group.id}` as const

  function exitGroup() {
    if (window.confirm(isOwner ? 'Delete this group?' : 'Leave this group?')) {
      action.mutate(async () => {
        await api<void>(isOwner ? path : `${path}/leave`, { method: 'DELETE' })
        void navigate('/groups', { replace: true })
      })
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">{group.name}</h1>
      {group.description && <p>{group.description}</p>}
      {isOwner && (
        <section className="space-y-3">
          <h2 className="font-semibold">Edit group</h2>
          <GroupForm
            group={group}
            disabled={action.isPending}
            onSave={(json) =>
              action.mutate(() => api<Group>(path, { method: 'PATCH', json }))
            }
          />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="font-semibold">Members</h2>
        <ul className="space-y-3">
          {group.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-2">
              <span>
                {member.user.name || member.user.email} ({member.role})
              </span>
              {isOwner && member.userId !== userId && (
                <>
                  <Button
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          'Transfer group ownership to this member?',
                        )
                      )
                        action.mutate(() =>
                          api<void>(
                            `${path}/members/${member.userId}/transfer-ownership`,
                            { method: 'POST' },
                          ),
                        )
                    }}
                  >
                    Transfer ownership
                  </Button>
                  <Button
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => {
                      if (window.confirm('Remove this member?'))
                        action.mutate(() =>
                          api<void>(`${path}/members/${member.userId}`, {
                            method: 'DELETE',
                          }),
                        )
                    }}
                  >
                    Remove member
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
        {isOwner && (
          <InviteForm
            disabled={action.isPending}
            onInvite={(json) =>
              action.mutate(() =>
                api<InviteMemberResponse>(`${path}/members`, {
                  method: 'POST',
                  json,
                }),
              )
            }
          />
        )}
      </section>
      <Button
        variant={isOwner ? 'destructive' : 'outline'}
        disabled={action.isPending}
        onClick={exitGroup}
      >
        {isOwner ? 'Delete group' : 'Leave group'}
      </Button>
      <ActionFeedback action={action} />
      <GroupWishes group={group} userId={userId} />
    </>
  )
}

export function GroupPage() {
  const { groupId } = useParams()
  const group = useApiQuery<Group>(
    `/groups/${encodeURIComponent(groupId ?? '')}`,
  )
  const profile = useApiQuery<ProfileResponse>('/users/profile')

  return (
    <div className="space-y-5">
      <Link className="underline" to="/groups">
        Back to groups
      </Link>
      <QueryContent query={group}>
        {(data) => (
          <QueryContent query={profile}>
            {({ userId }) => (
              <GroupDetails key={data.id} group={data} userId={userId} />
            )}
          </QueryContent>
        )}
      </QueryContent>
    </div>
  )
}
