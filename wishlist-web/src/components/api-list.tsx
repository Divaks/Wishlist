import { useState, type ReactNode } from 'react'
import { QueryContent } from '@/components/api-feedback'
import { Button } from '@/components/ui/button'
import { useApiQuery } from '@/hooks/use-api-query'
import type { ApiPath } from '@/lib/api/client'
import type { Page } from '@/types/api'

type ApiListProps<T> = {
  pagedPath: ApiPath
  empty: string
  children: (items: T[], refresh: () => void) => ReactNode
}

export function ApiList<T>({ pagedPath, empty, children }: ApiListProps<T>) {
  const [page, setPage] = useState(1)
  const query = useApiQuery<Page<T>>(`${pagedPath}?page=${page}&limit=5`)
  const lastPage = query.data ? Math.max(1, query.data.totalPages) : null

  if (lastPage !== null && page > lastPage) {
    setPage(lastPage)
  }

  return (
    <div className="space-y-3">
      <QueryContent query={query}>
        {(data) => {
          const items = data.data
          return (
            <>
              {items.length ? (
                children(
                  items,
                  () => void query.refetch({ cancelRefetch: false }),
                )
              ) : (
                <p className="empty-state">{empty}</p>
              )}
              {data.totalPages > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    {data.totalPages
                      ? `Page ${data.page} of ${data.totalPages}`
                      : 'No pages'}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )
        }}
      </QueryContent>
    </div>
  )
}
