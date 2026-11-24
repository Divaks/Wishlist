import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { FormErrors } from '@/components/form-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CreateWishRequest, WishItem } from '@/types/api'

const wishSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.'),
  description: z.string().trim(),
  currency: z.enum(['UAH', 'EUR', 'USD']),
  price: z.number().min(-99_999_999.99).max(99_999_999.99),
  link: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]),
  isInCart: z.boolean(),
})

export function WishForm({
  wish,
  disabled,
  onSave,
  children,
}: {
  wish?: WishItem
  disabled: boolean
  onSave: (data: CreateWishRequest) => void
  children?: ReactNode
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
      currency: wish?.currency ?? 'UAH',
      link: wish?.link ?? '',
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label className="grid gap-1">
            Price
            <Input
              {...register('price', { valueAsNumber: true })}
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              type="number"
              min="-99999999.99"
              max="99999999.99"
              step="0.01"
              required
            />
          </label>
          <label className="grid gap-1">
            Currency
            <select
              {...register('currency')}
              className="h-11 rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="UAH">₴ UAH</option>
              <option value="EUR">€ EUR</option>
              <option value="USD">$ USD</option>
            </select>
          </label>
        </div>
        <label>
          Product link
          <Input {...register('link')} type="url" />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" {...register('isInCart')} />
          In cart
        </label>
        {children}
        <FormErrors errors={errors} />
        <Button type="submit" className="w-fit">
          {wish ? 'Save wish' : 'Create wish'}
        </Button>
      </fieldset>
    </form>
  )
}
