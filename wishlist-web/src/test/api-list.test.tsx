import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'
import { AuthProvider } from '@/app/auth-provider'
import { ApiList } from '@/components/api-list'
import { mockAccessToken } from './mocks/handlers'
import { server } from './mocks/server'

it.each([5, 0])(
  'recovers when the last page disappears and %i items remain',
  async (remaining) => {
    let total = 6
    server.use(
      http.get('*/api/groups/paged', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'))
        return HttpResponse.json({
          data:
            page === 1 && total > 0
              ? ['First group']
              : total === 6
                ? ['Last group']
                : [],
          total,
          page,
          limit: 5,
          totalPages: Math.ceil(total / 5),
        })
      }),
    )
    localStorage.setItem('wishlist.accessToken', mockAccessToken)
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ApiList<string> pagedPath="/groups/paged" empty="No groups yet.">
              {(items) => (
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </ApiList>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Last group')).toBeVisible()
    total = remaining
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['api', 'groups'] })
    })
    expect(
      await screen.findByText(remaining ? 'First group' : 'No groups yet.'),
    ).toBeVisible()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Previous' }),
      ).not.toBeInTheDocument()
    })
  },
)
