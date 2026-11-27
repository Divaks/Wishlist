import type { ApiClient } from '@/lib/api/client'

export async function uploadWishPhoto(api: ApiClient, id: string, photo: File) {
  const body = new FormData()
  body.set('photo', photo, photo.name)
  await api<void>(`/wishlist/${encodeURIComponent(id)}/photo`, {
    method: 'PUT',
    body,
  })
}
