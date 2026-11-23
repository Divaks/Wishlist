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
  if (query.isPending) return <p role="status">Loading…</p>

  if (query.isError) {
    return (
      <div>
        <p role="alert">{query.error.message}</p>
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
  if (action.isPending) return <p role="status">Working…</p>
  if (action.error) return <p role="alert">{action.error.message}</p>
  if (action.isSuccess) return <p role="status">Done.</p>
}
