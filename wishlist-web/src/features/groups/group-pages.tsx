import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ActionFeedback, QueryContent } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { GroupNotice } from '@/features/groups/group-notice'
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
      <h1 className="page-title">Groups</h1>
      <GroupNotice />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <h2 className="section-title">My groups</h2>
          <ApiList<Group> pagedPath="/groups/paged" empty="No groups yet.">
            {(items) => (
              <ul className="card-grid">
                {items.map((group) => (
                  <li key={group.id} className="item-card">
                    <h3 className="font-display text-2xl leading-tight font-medium">
                      <Link className="text-link" to={group.id}>
                        {group.name}
                      </Link>
                    </h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                    <span className="tag">
                      {group.members.length}{' '}
                      {group.members.length === 1 ? 'member' : 'members'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ApiList>
        </section>
        <div className="space-y-5">
          <section className="panel">
            <h2 className="section-title">New group</h2>
            <GroupForm
              disabled={create.isPending}
              onSave={(json) =>
                create.mutate(async () => {
                  const group = await api<Group>('/groups', {
                    method: 'POST',
                    json,
                  })
                  void navigate(`/groups/${group.id}`, {
                    state: { groupNotice: 'created' },
                  })
                })
              }
            />
            <ActionFeedback action={create} successMessage="Group created" />
          </section>
          <section className="panel">
            <h2 className="section-title">Invitations</h2>
            <QueryContent query={invitations}>
              {(items) =>
                items.length ? (
                  <ul className="space-y-2">
                    {items.map(({ groupId }) => (
                      <li
                        key={groupId}
                        className="flex flex-wrap items-center gap-2 rounded-xl bg-background p-3"
                      >
                        <span className="min-w-0 text-sm wrap-break-word">
                          Group {groupId}
                        </span>
                        <Button
                          variant="outline"
                          disabled={accept.isPending}
                          onClick={() =>
                            accept.mutate(async () => {
                              await api<void>(
                                `/groups/${groupId}/invitations/accept`,
                                { method: 'POST' },
                              )
                              void navigate(`/groups/${groupId}`, {
                                state: { groupNotice: 'accepted' },
                              })
                            })
                          }
                        >
                          Accept invitation
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">No pending invitations.</p>
                )
              }
            </QueryContent>
            <ActionFeedback
              action={accept}
              successMessage="Invitation accepted"
            />
          </section>
        </div>
      </div>
    </div>
  )
}

function GroupDetails({ group, userId }: { group: Group; userId: string }) {
  const { api } = useAuth()
  const navigate = useNavigate()
  const action = useApiAction('groups')
  const [successMessage, setSuccessMessage] = useState('Group updated')
  const [view, setView] = useState<'wishes' | 'settings'>('wishes')

  function runAction(message: string, request: () => Promise<unknown>) {
    setSuccessMessage(message)
    action.mutate(request)
  }
  const isOwner = group.createdById === userId
  const path = `/groups/${group.id}` as const

  function exitGroup() {
    if (window.confirm(isOwner ? 'Delete this group?' : 'Leave this group?')) {
      runAction(isOwner ? 'Group deleted' : 'Group left', async () => {
        await api<void>(isOwner ? path : `${path}/leave`, { method: 'DELETE' })
        void navigate('/groups', {
          replace: true,
          state: { groupNotice: isOwner ? 'deleted' : 'left' },
        })
      })
    }
  }

  return (
    <>
      <h1 className="page-title">{group.name}</h1>
      {group.description && (
        <p className="text-muted-foreground wrap-break-word">
          {group.description}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul aria-label="Group members" className="flex -space-x-2">
          {group.members.slice(0, 6).map((member) => {
            const name = member.user.name || member.user.email
            return (
              <li
                key={member.id}
                title={name}
                className="flex size-10 items-center justify-center rounded-full border-2 border-background bg-secondary text-sm font-bold"
              >
                <span className="sr-only">{name}</span>
                <span aria-hidden="true">
                  {name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </li>
            )
          })}
          {group.members.length > 6 && (
            <li className="flex size-10 items-center justify-center rounded-full border-2 border-background bg-secondary text-sm font-semibold">
              +{group.members.length - 6}
            </li>
          )}
        </ul>
        {isOwner && (
          <Button
            variant="outline"
            onClick={() => {
              setView('settings')
              requestAnimationFrame(() =>
                document.getElementById('invite-email')?.focus(),
              )
            }}
          >
            + Invite
          </Button>
        )}
      </div>
      <nav aria-label="Group sections" className="flex gap-2 border-b pb-3">
        <Button
          id="group-wishes-view"
          variant={view === 'wishes' ? 'default' : 'ghost'}
          aria-pressed={view === 'wishes'}
          aria-controls="group-wishes-panel"
          onClick={() => setView('wishes')}
        >
          Wishes
        </Button>
        <Button
          id="group-settings-view"
          variant={view === 'settings' ? 'default' : 'ghost'}
          aria-pressed={view === 'settings'}
          aria-controls="group-settings-panel"
          onClick={() => setView('settings')}
        >
          Members &amp; Settings
        </Button>
      </nav>
      <section
        id="group-wishes-panel"
        aria-labelledby="group-wishes-view"
        hidden={view !== 'wishes'}
      >
        <GroupWishes group={group} userId={userId} />
      </section>
      <section
        id="group-settings-panel"
        aria-labelledby="group-settings-view"
        hidden={view !== 'settings'}
      >
        <div className="mx-auto max-w-3xl space-y-5">
          {isOwner && (
            <section className="panel">
              <h2 className="section-title">Edit group</h2>
              <GroupForm
                group={group}
                disabled={action.isPending}
                onSave={(json) =>
                  runAction('Group updated', () =>
                    api<Group>(path, { method: 'PATCH', json }),
                  )
                }
              />
            </section>
          )}
          <section className="panel">
            <h2 className="section-title">Members</h2>
            <ul className="space-y-3">
              {group.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="tag">
                    {member.user.name || member.user.email}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {member.role}
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
                            runAction('Ownership transferred', () =>
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
                            runAction('Member removed', () =>
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
                  runAction('Invitation sent', () =>
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
          <ActionFeedback action={action} successMessage={successMessage} />
        </div>
      </section>
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
      <Link className="text-link text-sm" to="/groups">
        Back to groups
      </Link>
      <GroupNotice />
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
