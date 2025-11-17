import { defineSchema } from 'convex/server'
import { researchTables } from './research/schema'
import { orchestrationTables } from './orchestration/schema'
import { messagingTables } from './messaging/schema'
import { reviewsTables } from './reviews/schema'
import { userProfilesTables } from './auth/schema'
import { concurrencyTables } from './concurrency/schema'
import { usageTrackingTables } from './usage_tracking/schema'

export default defineSchema({
  ...researchTables,
  ...orchestrationTables,
  ...messagingTables,
  ...reviewsTables,
  ...userProfilesTables,
  ...concurrencyTables,
  ...usageTrackingTables,
})
