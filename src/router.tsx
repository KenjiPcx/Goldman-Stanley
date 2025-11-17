import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import type { ReactNode } from 'react'

import * as Sentry from '@sentry/tanstackstart-react'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

const DefaultNotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <div className="text-4xl font-semibold tracking-tight">Page not found</div>
    <p className="max-w-md text-base text-muted-foreground">
      We couldn&apos;t find the page you were looking for. Check the URL or use
      the navigation to get back on track.
    </p>
  </div>
)

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: { ...rqContext },
    defaultPreload: 'intent',
    Wrap: ({ children }: { children: ReactNode }) => (
      <TanstackQuery.Provider {...rqContext}>
        {children}
      </TanstackQuery.Provider>
    ),
    defaultNotFoundComponent: DefaultNotFound,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [],
    })
  }

  return router
}

