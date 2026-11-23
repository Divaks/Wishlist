import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ActionFeedback, QueryContent } from '@/components/api-feedback'
import { FormErrors } from '@/components/form-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiAction } from '@/hooks/use-api-action'
import { useApiQuery } from '@/hooks/use-api-query'
import { useAuth } from '@/hooks/use-auth'
import type { ProfileResponse, UpdateProfileRequest, User } from '@/types/api'

const profileSchema = z.object({
  name: z.string().trim().max(100),
  birthday: z.union([z.literal(''), z.iso.date()]),
})

function ProfileForm({ profile }: { profile: ProfileResponse }) {
  const { api, setAccessToken } = useAuth()
  const action = useApiAction('users', 'groups')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name ?? '',
      birthday: profile.birthday ?? '',
    },
  })

  const save = handleSubmit(({ name, birthday }) => {
    const json: UpdateProfileRequest = {
      name: name || null,
      birthday: birthday || null,
    }
    action.mutate(() => api<User>('/users/profile', { method: 'PATCH', json }))
  })

  function deleteAccount() {
    if (window.confirm('Permanently delete your account and wishes?')) {
      action.mutate(async () => {
        await api<void>('/users/account', { method: 'DELETE' })
        setAccessToken(null)
      })
    }
  }

  return (
    <div className="panel">
      <p className="text-sm text-muted-foreground wrap-break-word">
        {profile.email}
      </p>
      <form onSubmit={save}>
        <fieldset disabled={action.isPending} className="grid gap-3">
          <label>
            Name
            <Input {...register('name')} maxLength={100} />
          </label>
          <label>
            Birthday
            <Input {...register('birthday')} type="date" />
          </label>
          <FormErrors errors={errors} />
          <Button type="submit" className="w-fit">
            Save profile
          </Button>
        </fieldset>
      </form>
      <hr className="my-5 border-border" />
      <Button
        type="button"
        variant="destructive"
        disabled={action.isPending}
        onClick={deleteAccount}
      >
        Delete account
      </Button>
      <ActionFeedback action={action} successMessage="Profile updated" />
    </div>
  )
}

export function ProfilePage() {
  const profile = useApiQuery<ProfileResponse>('/users/profile')
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="page-title">Profile</h1>
      <QueryContent query={profile}>
        {(data) => <ProfileForm key={data.userId} profile={data} />}
      </QueryContent>
    </div>
  )
}
