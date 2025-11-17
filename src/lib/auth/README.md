# Authentication Middleware for TanStack Start

This directory contains the authentication middleware implementation for TanStack Start, providing similar functionality to Next.js middleware with Clerk.

## How It Works

Unlike Next.js which has a dedicated `middleware.ts` file, TanStack Start uses the `beforeLoad` hook on routes to implement middleware-like behavior.

### Key Components

1. **`middleware.ts`** - Route matchers and configuration
   - `createRouteMatcher()` - Similar to Next.js `createRouteMatcher`
   - `isProtectedRoute()` - Defines which routes require authentication
   - `AUTH_ROUTES` - Configuration for redirect URLs

2. **`protected-route.ts`** - Route protection utilities
   - `protectedRouteBeforeLoad` - Default protection function
   - `createProtectedRoute()` - Customizable protection with options

### Usage

#### Protecting a Route

Add `beforeLoad` to any route that requires authentication:

```typescript
// src/routes/protected-page.tsx
import { createFileRoute } from '@tanstack/react-router'
import { protectedRouteBeforeLoad } from '@/lib/auth/protected-route'

export const Route = createFileRoute('/protected-page')({
  beforeLoad: protectedRouteBeforeLoad,
  component: ProtectedPage
})
```

#### What Happens When Unauthorized

1. User tries to access `/research-chat` without being signed in
2. `beforeLoad` checks Clerk auth state via `window.Clerk`
3. If not authenticated, redirects to `/` with `?from=/research-chat` in the URL
4. User sees Clerk sign-in modal on home page
5. After signing in, can navigate back to their intended destination

### Protected Routes Configuration

Edit `src/lib/auth/middleware.ts` to change which routes are protected:

```typescript
export const isProtectedRoute = createRouteMatcher([
  '/research-chat',
  '/datasets',
  '/reviews',
  // Add more routes here
])
```

Supports wildcards:
```typescript
createRouteMatcher([
  '/admin/*',  // Protects all routes under /admin
  '/dashboard', // Exact match only
])
```

### Authentication Flow

```
User → Protected Route → beforeLoad hook
                              ↓
                      Check window.Clerk.user
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Authenticated         Not Authenticated
                    ↓                   ↓
            Render Page          Redirect to /
                              (Clerk modal appears)
```

### Differences from Next.js Middleware

| Next.js | TanStack Start |
|---------|----------------|
| `middleware.ts` in root | `beforeLoad` in each route |
| Runs on all requests | Runs per-route navigation |
| Server-side execution | Client-side (can add SSR) |
| `auth().protect()` | `window.Clerk` check |

### Why Use Modals Instead of Dedicated Pages?

We use Clerk's modal components (`<SignInButton mode="modal">`) instead of dedicated sign-in/sign-up pages because:

1. **Simpler** - No need to maintain separate pages
2. **Better UX** - Users stay on the current page context
3. **Less code** - Fewer routes to manage
4. **Consistent** - Same experience across the app

### Server-Side Rendering (Future)

For SSR, you would:
1. Use Clerk's server-side `getAuth()` in `beforeLoad`
2. Check authentication before rendering
3. Return appropriate redirects or data

Example:
```typescript
export async function protectedRouteBeforeLoad(opts: any) {
  if (opts.context.isServer) {
    // Server-side auth check
    const auth = getAuth(opts.context.req)
    if (!auth.userId) {
      throw redirect({ to: '/' })
    }
  } else {
    // Client-side check (current implementation)
    // ...
  }
}
```

## Summary

This implementation provides Next.js middleware-like functionality in TanStack Start by:
- Using `beforeLoad` hooks for route protection
- Checking Clerk auth state via `window.Clerk`
- Redirecting unauthorized users to home page
- Using Clerk modals for authentication UI

