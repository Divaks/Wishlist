import { useMutation, useQueryClient } from '@tanstack/react-query'

type ApiScope = 'groups' | 'users' | 'wishlist'

export function useApiAction(...scopes: ApiScope[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () =>
      Promise.all(
        scopes.map((scope) =>
          queryClient.invalidateQueries({ queryKey: ['api', scope] }),
        ),
      ),
  })
}
