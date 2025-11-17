import { useUser } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useEffect, useState } from 'react'

function ConvexUserSyncInner() {
    const { user, isSignedIn } = useUser()
    const getOrCreateUser = useMutation(api.auth.users.getOrCreateCurrentUser)

    useEffect(() => {
        if (isSignedIn && user) {
            // Create or get the user in Convex when they sign in
            getOrCreateUser({
                email: user.primaryEmailAddress?.emailAddress ?? '',
                name: user.fullName ?? undefined,
            }).catch((error) => {
                console.error('Failed to sync user with Convex:', error)
            })
        }
    }, [isSignedIn, user, getOrCreateUser])

    return null
}

export function ConvexUserSync() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Only render the inner component after mount (client-side only)
    if (!mounted) {
        return null
    }

    return <ConvexUserSyncInner />
}

