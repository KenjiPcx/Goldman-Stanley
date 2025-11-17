import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get the current user's ID from Clerk authentication
 */
export async function getCurrentUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    return identity?.subject ?? null;
}

/**
 * Get the current user's profile from the database
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;

    return await ctx.db
        .query("userProfiles")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", userId))
        .first();
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
    const user = await getCurrentUser(ctx);
    return user?.role === "admin";
}

/**
 * Require the current user to be authenticated
 * Throws an error if not authenticated
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
        throw new Error("Authentication required");
    }
    return userId;
}

/**
 * Require the current user to be an admin
 * Throws an error if not authenticated or not an admin
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
    await requireAuth(ctx);
    const admin = await isAdmin(ctx);
    if (!admin) {
        throw new Error("Admin role required");
    }
}

/**
 * Get or create a user profile when they first log in
 * This should be called from the frontend after authentication
 */
export async function getOrCreateUserProfile(
    ctx: MutationCtx,
    tokenIdentifier: string,
    email: string,
    name?: string
): Promise<Id<"userProfiles">> {
    // Check if user already exists
    const existingUser = await ctx.db
        .query("userProfiles")
        .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
        .first();

    if (existingUser) {
        return existingUser._id;
    }

    // Create new user profile with viewer role by default
    // Admins must be manually promoted in the database
    const userId = await ctx.db.insert("userProfiles", {
        tokenIdentifier,
        email,
        name,
        role: "viewer",
        createdAt: Date.now(),
    });

    return userId;
}

