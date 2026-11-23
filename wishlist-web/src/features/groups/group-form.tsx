import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormErrors } from '@/components/form-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreateGroupRequest, Group } from '@/types/api'

const groupSchema = z.object({
  name: z.string().trim().min(1, 'Enter a group name.'),
  description: z.string().trim(),
})

export function GroupForm({
  group,
  disabled,
  onSave,
}: {
  group?: Group
  disabled: boolean
  onSave: (group: CreateGroupRequest) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
    },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(({ name, description }) => {
        onSave({ name, description: description || null })
      })}
    >
      <fieldset disabled={disabled} className="grid gap-3">
        <label>
          Group name
          <Input {...register('name')} required />
        </label>
        <label>
          Description
          <Input {...register('description')} />
        </label>
        <FormErrors errors={errors} />
        <Button type="submit" className="w-fit">
          {group ? 'Save group' : 'Create group'}
        </Button>
      </fieldset>
    </form>
  )
}
