import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import type { ApiPath } from '@/lib/api/client'

export function useApiQuery<T>(path: ApiPath) {
  const { api } = useAuth()
  return useQuery({
    queryKey: ['api', path.split(/[/?]/)[1], path],
    queryFn: ({ signal }) => api<T>(path, { signal }),
    retry: false,
  })
}
