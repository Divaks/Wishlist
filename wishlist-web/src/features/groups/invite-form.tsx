import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormErrors } from '@/components/form-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InviteMemberRequest } from '@/types/api'

const invitationSchema = z.object({
  email: z.email('Enter a valid email address.'),
})

export function InviteForm({
  disabled,
  onInvite,
}: {
  disabled: boolean
  onInvite: (invitation: InviteMemberRequest) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invitationSchema),
    defaultValues: { email: '' },
  })

  return (
    <form onSubmit={handleSubmit(onInvite)}>
      <fieldset disabled={disabled} className="grid gap-3">
        <label>
          Invite by email
          <Input {...register('email')} type="email" required />
        </label>
        <FormErrors errors={errors} />
        <Button type="submit" className="w-fit">
          Send invitation
        </Button>
      </fieldset>
    </form>
  )
}
