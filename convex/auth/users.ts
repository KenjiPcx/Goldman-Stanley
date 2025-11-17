import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser, requireAuth } from "./helpers";
import { userProfileSchema } from "./schema";

/**
 * Get or create the current user's profile
 * Should be called on login/signup
 */
export const getOrCreateCurrentUser = mutation({
    args: {
        email: v.string(),
        name: v.optional(v.string()),
    },
    returns: userProfileSchema.extend({
        _id: v.id("userProfiles"),
        _creationTime: v.number(),
    }),
    handler: async (ctx, args) => {
        const tokenIdentifier = await requireAuth(ctx);

        // Check if user already exists
        const existingUser = await ctx.db
            .query("userProfiles")
            .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
            .first();

        if (existingUser) {
            return existingUser;
        }

        // Create new user profile with viewer role by default
        const userId = await ctx.db.insert("userProfiles", {
            tokenIdentifier,
            email: args.email,
            name: args.name,
            role: "viewer",
            createdAt: Date.now(),
        });

        const newUser = await ctx.db.get(userId);
        if (!newUser) {
            throw new Error("Failed to create user profile");
        }

        return newUser;
    },
});

/**
 * Get the current user's profile
 */
export const getCurrentUserProfile = query({
    args: {},
    returns: v.union(userProfileSchema.extend({
        _id: v.id("userProfiles"),
        _creationTime: v.number(),
    }), v.null()),
    handler: async (ctx) => {
        return await getCurrentUser(ctx);
    },
});

/**
 * Check if the current user is an admin
 */
export const isCurrentUserAdmin = query({
    args: {},
    returns: v.boolean(),
    handler: async (ctx) => {
        const user = await getCurrentUser(ctx);
        return user?.role === "admin";
    },
});

