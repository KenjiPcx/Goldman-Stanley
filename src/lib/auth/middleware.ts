import { redirect } from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'

/**
 * Route matcher utility - similar to Next.js createRouteMatcher
 * Checks if the current path matches any of the protected routes
 */
export function createRouteMatcher(routes: string[]) {
  return (pathname: string) => {
    return routes.some((route) => {
      // Exact match
      if (route === pathname) return true
      
      // Wildcard match (e.g., "/admin/*")
      if (route.endsWith('/*')) {
        const baseRoute = route.slice(0, -2)
        return pathname.startsWith(baseRoute)
      }
      
      return false
    })
  }
}

/**
 * Protected routes configuration
 * Add your protected routes here
 */
export const isProtectedRoute = createRouteMatcher([
  '/research-chat',
  '/datasets',
  '/reviews',
  // Add more protected routes as needed
])

/**
 * Public routes that should redirect to dashboard if already authenticated
 */
export const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
])

/**
 * Auth redirect URLs
 * Note: We use Clerk modals, so no separate sign-in/sign-up pages needed
 */
export const AUTH_ROUTES = {
  afterSignOut: '/',
  afterSignIn: '/research-chat',
} as const

/**
 * Middleware function to check authentication
 * This is called in the beforeLoad hook of protected routes
 */
export async function requireAuth(opts: {
  isAuthenticated: boolean
  isLoaded: boolean
  pathname: string
}) {
  const { isAuthenticated, isLoaded, pathname } = opts

  // Wait for auth to load
  if (!isLoaded) {
    throw new Error('Auth not loaded')
  }

  // Check if route is protected
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      // Redirect to sign-in with return URL
      throw redirect({
        to: AUTH_ROUTES.signIn,
        search: {
          redirect: pathname,
        },
      })
    }
  }

  // Optionally: Redirect authenticated users away from public pages
  // if (isPublicRoute(pathname) && isAuthenticated && pathname !== '/') {
  //   throw redirect({
  //     to: AUTH_ROUTES.afterSignIn,
  //   })
  // }
}

/**
 * Helper to get redirect URL from search params
 */
export function getRedirectUrl(search: Record<string, any>): string {
  return search.redirect || AUTH_ROUTES.afterSignIn
}

