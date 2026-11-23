import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ActionNotice } from '@/components/action-notice'

const messages = {
  created: 'Group created',
  accepted: 'Invitation accepted',
  deleted: 'Group deleted',
  left: 'Group left',
}

export function GroupNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const state: unknown = location.state
  const value =
    state && typeof state === 'object' && 'groupNotice' in state
      ? state.groupNotice
      : null
  const message =
    typeof value === 'string' && Object.hasOwn(messages, value)
      ? messages[value as keyof typeof messages]
      : null
  const [notice] = useState(message)

  useEffect(() => {
    if (message) {
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, message, navigate])

  return notice ? (
    <ActionNotice
      title={notice}
      description="Your request was completed successfully."
    />
  ) : null
}
