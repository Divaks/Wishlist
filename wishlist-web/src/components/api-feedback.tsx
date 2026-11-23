import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ActionNotice } from '@/components/action-notice'
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
  successMessage,
}: {
  action: { isPending: boolean; isSuccess: boolean; error: Error | null }
  successMessage: string
}) {
  if (action.isPending)
    return (
      <ActionNotice
        title="Working…"
        description="Please wait while your request is processed."
      />
    )
  if (action.error)
    return (
      <ActionNotice
        title="Action failed"
        description={action.error.message}
        error
      />
    )
  if (action.isSuccess)
    return (
      <ActionNotice
        title={successMessage}
        description="Your request was completed successfully."
      />
    )
}
