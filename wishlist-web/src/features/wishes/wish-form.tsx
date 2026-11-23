import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormErrors } from '@/components/form-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreateWishRequest, WishItem } from '@/types/api'

const wishSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.'),
  description: z.string().trim(),
  price: z.number().min(-99_999_999.99).max(99_999_999.99),
  link: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]),
  priority: z.enum(['low', 'medium', 'high']),
  isInCart: z.boolean(),
})

export function WishForm({
  wish,
  disabled,
  onSave,
}: {
  wish?: WishItem
  disabled: boolean
  onSave: (data: CreateWishRequest) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(wishSchema),
    defaultValues: {
      title: wish?.title ?? '',
      description: wish?.description ?? '',
      price: wish?.price ?? 0,
      link: wish?.link ?? '',
      priority: wish?.priority ?? 'medium',
      isInCart: wish?.isInCart ?? false,
    },
  })

  return (
    <form
      onSubmit={handleSubmit(({ description, link, ...data }) => {
        onSave({
          ...data,
          description: description || null,
          link: link || null,
        })
      })}
    >
      <fieldset disabled={disabled} className="grid gap-3">
        <label>
          Title
          <Input {...register('title')} required />
        </label>
        <label>
          Description
          <Input {...register('description')} />
        </label>
        <label>
          Price
          <Input
            {...register('price', { valueAsNumber: true })}
            type="number"
            min="-99999999.99"
            max="99999999.99"
            step="0.01"
            required
          />
        </label>
        <label>
          Product link
          <Input {...register('link')} type="url" />
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="wish-priority">Priority</label>
          <select
            id="wish-priority"
            {...register('priority')}
            className="rounded border p-1"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <label className="flex gap-2">
          <input type="checkbox" {...register('isInCart')} />
          In cart
        </label>
        <FormErrors errors={errors} />
        <Button type="submit" className="w-fit">
          {wish ? 'Save wish' : 'Create wish'}
        </Button>
      </fieldset>
    </form>
  )
}
