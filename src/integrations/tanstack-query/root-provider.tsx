import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent queries from refetching on window focus during SSR
        refetchOnWindowFocus: false,
        // Reduce retry attempts to prevent stream issues
        retry: 1,
        // Stale time to prevent unnecessary refetches
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  })
  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
