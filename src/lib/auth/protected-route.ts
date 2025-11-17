import { redirect } from '@tanstack/react-router'
import type { RouteContext } from '@tanstack/react-router'
import { AUTH_ROUTES } from './middleware'

/**
 * Protected route beforeLoad function
 * Use this in your route definitions to protect them with Clerk auth
 * 
 * When a user tries to access a protected route without being authenticated,
 * they'll be redirected to the home page where they can sign in via the modal.
 * 
 * Example:
 * ```ts
 * import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route'
 * 
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: protectedRouteBeforeLoad,
 *   component: ProtectedPage
 * })
 * ```
 */
export async function protectedRouteBeforeLoad(opts: {
  context: RouteContext
  location: { pathname: string; search: Record<string, any> }
}) {
  const { location } = opts

  // Check auth state using Clerk
  if (typeof window !== 'undefined') {
    // Client-side: Check using window.Clerk
    const clerk = (window as any).Clerk
    
    if (clerk && clerk.loaded && !clerk.user) {
      // Redirect to home where they can sign in via modal
      throw redirect({
        to: '/',
        search: {
          // Store where they were trying to go
          from: location.pathname,
        },
      })
    }
  }
  
  // Server-side auth checking would go here if using SSR
  // For now, we rely on client-side checks
}

/**
 * Alternative: Create a custom beforeLoad with options
 */
export function createProtectedRoute(options?: {
  redirectTo?: string
  requireAuth?: boolean
}) {
  return async (opts: {
    context: RouteContext
    location: { pathname: string; search: Record<string, any> }
  }) => {
    const { location } = opts
    const redirectTo = options?.redirectTo || '/'

    if (options?.requireAuth !== false) {
      if (typeof window !== 'undefined') {
        const clerk = (window as any).Clerk
        
        if (clerk && clerk.loaded && !clerk.user) {
          throw redirect({
            to: redirectTo,
            search: {
              from: location.pathname,
            },
          })
        }
      }
    }
  }
}

