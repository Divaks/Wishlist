import { useEffect, useRef, useState } from 'react'
import { ActionFeedback } from '@/components/api-feedback'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApiAction } from '@/hooks/use-api-action'
import { useAuth } from '@/hooks/use-auth'
import { uploadWishPhoto } from './wish-photo-api'
import type { WishItem } from '@/types/api'

export function WishPhoto({
  wish,
  refresh,
}: {
  wish: WishItem
  refresh: () => void
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const attemptedRefresh = useRef(false)
  const url = wish.photoUrl

  if (url && url !== failedUrl) {
    return (
      <img
        src={url}
        alt={`Photo of ${wish.title}`}
        className="aspect-video w-full rounded-xl bg-secondary object-contain"
        referrerPolicy="no-referrer"
        onLoad={() => {
          attemptedRefresh.current = false
        }}
        onError={() => {
          setFailedUrl(url)
          if (!attemptedRefresh.current) {
            attemptedRefresh.current = true
            refresh()
          }
        }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className="flex size-12 items-center justify-center rounded-xl bg-secondary"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="size-6"
      >
        <path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" />
      </svg>
    </div>
  )
}

function PhotoPreview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const element = image.current
    if (!element) return
    const url = URL.createObjectURL(file)
    element.hidden = false
    element.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <img
      ref={image}
      alt="Selected photo preview"
      className="max-h-48 rounded-lg object-contain"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}

export function WishPhotoPicker({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (file: File | null) => void
}) {
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file && input.current) input.current.value = ''
  }, [file])

  return (
    <div className="grid gap-2">
      <label>
        {label}
        <Input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (!selected) return
            if (selected.size > 5 * 1024 * 1024) {
              event.target.value = ''
              onChange(null)
              setError('Choose a photo up to 5 MiB.')
              return
            }
            setError('')
            onChange(selected)
          }}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        JPEG, PNG, or WebP up to 5 MiB.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {file && (
        <>
          <PhotoPreview file={file} />
          <p className="text-sm wrap-anywhere">{file.name}</p>
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => onChange(null)}
          >
            Clear selection
          </Button>
        </>
      )}
    </div>
  )
}

export function WishPhotoEditor({ wish }: { wish: WishItem }) {
  const { api } = useAuth()
  const action = useApiAction('wishlist', 'groups')
  const [file, setFile] = useState<File | null>(null)

  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Wish photo</h3>
      <fieldset disabled={action.isPending} className="grid gap-3">
        <WishPhotoPicker
          label={
            wish.photoUrl ? 'Choose a replacement photo' : 'Choose a photo'
          }
          file={file}
          onChange={setFile}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!file}
            onClick={() => {
              if (file) {
                action.mutate(() => uploadWishPhoto(api, wish.id, file), {
                  onSuccess: () => setFile(null),
                })
              }
            }}
          >
            {wish.photoUrl ? 'Replace photo' : 'Upload photo'}
          </Button>
          {wish.photoUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                action.mutate(() =>
                  api<void>(`/wishlist/${encodeURIComponent(wish.id)}/photo`, {
                    method: 'DELETE',
                  }),
                )
              }
            >
              Remove photo
            </Button>
          )}
        </div>
      </fieldset>
      <ActionFeedback action={action} successMessage="Wish photo updated" />
    </section>
  )
}
