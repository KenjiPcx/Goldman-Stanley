/**
 * Auth Module - Schema Definitions
 * 
 * User authentication and authorization.
 */

import { defineTable } from "convex/server";
import { v, Infer } from "convex/values";

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

export const userRoleSchema = v.union(
    v.literal("admin"),
    v.literal("buyer"),
    v.literal("viewer")
);

export const userProfileSchema = v.object({
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    buyerId: v.optional(v.id("buyers")),
    role: userRoleSchema,
    createdAt: v.number(),
});

/**
 * User Profiles
 * 
 * User authentication table for buyer self-service updates and admin access.
 */
export const userProfiles = defineTable({
    ...userProfileSchema.fields,
})
    .index("by_email", ["email"])
    .index("by_token_identifier", ["tokenIdentifier"]);

export const userProfilesTables = {
    userProfiles,
}

// ============================================================================
// TYPE EXPORTS - For frontend and TypeScript usage
// ============================================================================

export type UserRole = Infer<typeof userRoleSchema>;
export type UserProfile = Infer<typeof userProfileSchema>;