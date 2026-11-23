const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message || `API request failed with HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ApiPath = `/${string}`
export type ApiRequestOptions = RequestInit & { json?: unknown }

export type ApiClient = <ResponseBody = unknown>(
  path: ApiPath,
  options?: ApiRequestOptions,
) => Promise<ResponseBody>

interface RequestAuth {
  accessToken: string | null
  onUnauthorized: () => void
}

export async function requestApi<ResponseBody>(
  path: ApiPath,
  { accessToken, onUnauthorized }: RequestAuth,
  { json, ...init }: ApiRequestOptions = {},
): Promise<ResponseBody> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    init.body = JSON.stringify(json)
  }

  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin)
  const response = await fetch(url, { ...init, headers })

  if (response.status === 401) {
    onUnauthorized()
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message
        : undefined
    const detail =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? message
              .filter((part): part is string => typeof part === 'string')
              .join(' ')
          : undefined
    throw new ApiError(response.status, detail)
  }

  const body = await response.text()
  return (body.length === 0 ? undefined : JSON.parse(body)) as ResponseBody
}
