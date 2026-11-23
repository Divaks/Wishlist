import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function QueryContent<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
}) {
  if (query.isPending)
    return (
      <p role="status" className="empty-state">
        Loading…
      </p>
    )

  if (query.isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/25 bg-card p-4">
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return children(query.data)
}

export function ActionFeedback({
  action,
}: {
  action: { isPending: boolean; isSuccess: boolean; error: Error | null }
}) {
  if (action.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Working…
      </p>
    )
  if (action.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {action.error.message}
      </p>
    )
  if (action.isSuccess)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Done.
      </p>
    )
}
