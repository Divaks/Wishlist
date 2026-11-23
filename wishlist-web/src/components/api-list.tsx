import { useState, type ReactNode } from 'react'
import { QueryContent } from '@/components/api-feedback'
import { Button } from '@/components/ui/button'
import { useApiQuery } from '@/hooks/use-api-query'
import type { ApiPath } from '@/lib/api/client'
import type { Page } from '@/types/api'

type ApiListProps<T> = {
  pagedPath: ApiPath
  empty: string
  children: (items: T[]) => ReactNode
} & ({ path: ApiPath } | { path?: never })

export function ApiList<T>({
  path,
  pagedPath,
  empty,
  children,
}: ApiListProps<T>) {
  const [paged, setPaged] = useState(!path)
  const [page, setPage] = useState(1)
  const query = useApiQuery<T[] | Page<T>>(
    paged || !path ? `${pagedPath}?page=${page}&limit=5` : path,
  )

  return (
    <div className="space-y-3">
      {path && (
        <label className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
          <input
            type="checkbox"
            checked={paged}
            onChange={(event) => {
              setPaged(event.target.checked)
              setPage(1)
            }}
          />
          Paginate
        </label>
      )}
      <QueryContent query={query}>
        {(data) => {
          const items = Array.isArray(data) ? data : data.data
          return (
            <>
              {items.length ? (
                children(items)
              ) : (
                <p className="empty-state">{empty}</p>
              )}
              {!Array.isArray(data) && (
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
