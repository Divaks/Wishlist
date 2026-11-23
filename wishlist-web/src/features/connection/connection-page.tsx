import { QueryContent } from '@/components/api-feedback'
import { Button } from '@/components/ui/button'
import { useApiQuery } from '@/hooks/use-api-query'
import type { HealthResponse } from '@/types/api'

export function ConnectionPage() {
  const health = useApiQuery<HealthResponse>('/health')
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">API connection</h1>
      <QueryContent query={health}>
        {({ status, timestamp }) => (
          <p>
            Health status: {status} ({timestamp})
          </p>
        )}
      </QueryContent>
      <Button
        variant="outline"
        onClick={() => {
          void health.refetch()
        }}
      >
        Check again
      </Button>
    </div>
  )
}
