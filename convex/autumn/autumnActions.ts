/**
 * Autumn Actions - Wrapper actions for Autumn API calls
 * 
 * Since Autumn uses fetch() internally, all calls must be made from actions
 * (not queries or mutations). This file provides internal actions that can be
 * called from queries/mutations via ctx.runAction().
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { autumn } from "../autumn";

/**
 * Check feature access for a user
 * Called from queries/mutations via ctx.runAction()
 */
export const checkFeatureAccess = internalAction({
    args: {
        featureId: v.string(),
    },
    returns: v.object({
        success: v.boolean(),
        balance: v.optional(v.number()),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<{ success: boolean, balance: number | undefined, error: string | undefined }> => {
        try {
            const featureCheck = await autumn.check(ctx, {
                featureId: args.featureId,
            });

            if (featureCheck.error) {
                return {
                    success: false,
                    balance: undefined,
                    error: featureCheck.error.message || "Feature check failed",
                };
            }

            return {
                success: true,
                balance: featureCheck.data?.balance ?? 0,
                error: undefined,
            };
        } catch (error: any) {
            console.error(`Autumn check error for ${args.featureId}:`, error);
            return {
                success: false,
                balance: undefined,
                error: error.message || "Unknown error",
            };
        }
    },
});

/**
 * Create a checkout session for purchasing features
 * Called from mutations via ctx.runAction()
 */
export const createCheckoutSession = internalAction({
    args: {
        productId: v.string(),
        options: v.array(v.object({
            featureId: v.string(),
            quantity: v.number(),
        })),
    },
    returns: v.object({
        success: v.boolean(),
        url: v.optional(v.string()),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<{ success: boolean, url: string | undefined, error: string | undefined }> => {
        try {
            const checkoutResult = await autumn.checkout(ctx, {
                productId: args.productId,
                options: args.options,
            });

            if (checkoutResult.error) {
                return {
                    success: false,
                    url: undefined,
                    error: checkoutResult.error.message || "Checkout failed",
                };
            }

            return {
                success: true,
                url: checkoutResult.data?.url,
                error: undefined,
            };
        } catch (error: any) {
            console.error("Autumn checkout error:", error);
            return {
                success: false, 
                url: undefined,
                error: error.message || "Unknown error",
            };
        }
    },
});

/**
 * Track feature usage
 * Called from mutations via ctx.scheduler.runAfter() for async tracking
 */
export const trackFeatureUsage = internalAction({
    args: {
        featureId: v.string(),
        value: v.number(),
        properties: v.optional(v.any()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        try {
            await autumn.track(ctx, {
                featureId: args.featureId,
                value: args.value,
                properties: args.properties,
            });
        } catch (error: any) {
            console.error(`Autumn track error for ${args.featureId}:`, error);
            // Don't throw - tracking failures shouldn't break the main flow
        }
        return null;
    },
});

