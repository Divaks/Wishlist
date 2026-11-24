import { useState } from 'react'
import { ActionNotice } from '@/components/action-notice'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QueryContent } from '@/components/api-feedback'
import { ApiList } from '@/components/api-list'
import { Button } from '@/components/ui/button'
import { WishFeedback } from '@/features/wishes/wish-feedback'
import { WishForm } from '@/features/wishes/wish-form'
import { WishPhotoEditor, WishPhotoPicker } from './wish-photo'
import { uploadWishPhoto } from './wish-photo-api'
import { WishSummary } from '@/features/wishes/wish-summary'
import { useApiAction } from '@/hooks/use-api-action'
import { useApiQuery } from '@/hooks/use-api-query'
import { useAuth } from '@/hooks/use-auth'
import type { WishItem } from '@/types/api'

export function WishlistPage() {
  const { api } = useAuth()
  const action = useApiAction('wishlist', 'groups')
  const photoAction = useApiAction('wishlist', 'groups')
  const [photo, setPhoto] = useState<File | null>(null)
  const [savedWishId, setSavedWishId] = useState<string | null>(null)

  const [creationCount, setCreationCount] = useState(0)
  const [successTitle, setSuccessTitle] = useState('Wish created')

  function finishCreation() {
    setSavedWishId(null)
    setPhoto(null)
  }

  function uploadPhoto(id: string, file: File) {
    photoAction.mutate(() => uploadWishPhoto(api, id, file), {
      onSuccess: finishCreation,
    })
  }

  function deleteWish(wish: WishItem) {
    if (!window.confirm(`Delete "${wish.title}"?`)) return

    setSuccessTitle('Wish deleted')
    action.mutate(() =>
      api<void>(`/wishlist/${encodeURIComponent(wish.id)}`, {
        method: 'DELETE',
      }),
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">My wishes</h1>
      {!savedWishId && (
        <WishFeedback action={action} successTitle={successTitle} />
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          <h2 className="section-title">Saved wishes</h2>
          <ApiList<WishItem>
            key={creationCount}
            pagedPath="/wishlist/paged"
            empty="No wishes yet."
          >
            {(items, refreshPhoto) => (
              <ul className="card-grid">
                {items.map((wish) => (
                  <li key={wish.id} className="item-card flex flex-col">
                    <WishSummary
                      wish={wish}
                      titleLink={wish.id}
                      refreshPhoto={refreshPhoto}
                      headerAction={
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Delete ${wish.title}`}
                          disabled={action.isPending || Boolean(savedWishId)}
                          onClick={() => deleteWish(wish)}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                          </svg>
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </ApiList>
        </section>
        <section className="panel">
          <h2 className="section-title">New wish</h2>
          {savedWishId ? (
            <div className="space-y-3">
              <ActionNotice
                title={
                  photoAction.error
                    ? 'Wish saved. Photo upload failed.'
                    : 'Wish saved. Uploading photo…'
                }
                description={
                  photoAction.error?.message ?? 'Your photo is being uploaded.'
                }
                error={Boolean(photoAction.error)}
              />
              {photoAction.error && (
                <fieldset className="grid gap-3">
                  <WishPhotoPicker
                    label="Wish photo"
                    file={photo}
                    onChange={setPhoto}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={!photo}
                      onClick={() => {
                        if (photo) uploadPhoto(savedWishId, photo)
                      }}
                    >
                      Retry photo upload
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={finishCreation}
                    >
                      Continue without photo
                    </Button>
                  </div>
                </fieldset>
              )}
            </div>
          ) : (
            <WishForm
              key={creationCount}
              disabled={action.isPending}
              onSave={(json) => {
                setSuccessTitle('Wish created')
                action.mutate(async () => {
                  const wish = await api<WishItem>('/wishlist', {
                    method: 'POST',
                    json,
                  })
                  setCreationCount((count) => count + 1)
                  if (photo) {
                    setSavedWishId(wish.id)
                    uploadPhoto(wish.id, photo)
                  } else {
                    finishCreation()
                  }
                })
              }}
            >
              <WishPhotoPicker
                label="Wish photo (optional)"
                file={photo}
                onChange={setPhoto}
              />
            </WishForm>
          )}
        </section>
      </div>
    </div>
  )
}

export function WishPage() {
  const { wishId } = useParams()
  const id = encodeURIComponent(wishId ?? '')
  const query = useApiQuery<WishItem>(`/wishlist/${id}`)
  const { api } = useAuth()
  const navigate = useNavigate()
  const action = useApiAction('wishlist', 'groups')

  function deleteWish() {
    if (!window.confirm('Delete this wish?')) return

    action.mutate(async () => {
      await api<void>(`/wishlist/${id}`, { method: 'DELETE' })
      void navigate('/wishlist', {
        replace: true,
        state: { wishNotice: 'deleted' },
      })
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-link text-sm" to="/wishlist">
        Back to my wishes
      </Link>
      <h1 className="page-title">Wish details</h1>
      <WishFeedback action={action} />
      <QueryContent query={query}>
        {(wish) => (
          <div className="panel">
            <WishSummary
              wish={wish}
              heading="h2"
              refreshPhoto={() => void query.refetch({ cancelRefetch: false })}
            />
            <hr className="my-5 border-border" />
            <WishPhotoEditor key={wish.id} wish={wish} />
            <hr className="my-5 border-border" />
            <WishForm
              key={wish.id}
              wish={wish}
              disabled={action.isPending}
              onSave={(json) =>
                action.mutate(() =>
                  api<WishItem>(`/wishlist/${id}`, { method: 'PATCH', json }),
                )
              }
            />
            <Button
              variant="destructive"
              disabled={action.isPending}
              onClick={deleteWish}
            >
              Delete wish
            </Button>
          </div>
        )}
      </QueryContent>
    </div>
  )
}
