import { ActionNotice } from '@/components/action-notice'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface WishFeedbackProps {
  action: { isPending: boolean; isSuccess: boolean; error: Error | null }
}

export function WishFeedback({ action }: WishFeedbackProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const routeState: unknown = location.state
  const message =
    routeState && typeof routeState === 'object' && 'wishNotice' in routeState
      ? routeState.wishNotice
      : null
  const [notice] = useState(
    message === 'created' || message === 'deleted' ? message : null,
  )

  useEffect(() => {
    if (message === 'created' || message === 'deleted') {
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, message, navigate])

  const title = action.isPending
    ? 'Saving wish…'
    : action.error
      ? 'Wish action failed'
      : action.isSuccess
        ? 'Wish updated'
        : notice === 'created'
          ? 'Wish created'
          : notice === 'deleted'
            ? 'Wish deleted'
            : null

  if (!title) return null

  return (
    <ActionNotice
      title={title}
      error={Boolean(action.error)}
      description={
        action.error?.message ||
        (action.isPending
          ? 'Please wait while your changes are saved.'
          : notice === 'deleted' && !action.isSuccess
            ? 'Your wish was deleted successfully.'
            : 'Your wish was saved successfully.')
      }
    />
  )
}
