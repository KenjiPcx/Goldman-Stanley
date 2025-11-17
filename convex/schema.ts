import { defineSchema } from 'convex/server'
import { researchTables } from './research/schema'
import { orchestrationTables } from './orchestration/schema'
import { messagingTables } from './messaging/schema'
import { reviewsTables } from './reviews/schema'
import { userProfilesTables } from './auth/schema'

export default defineSchema({
  ...researchTables,
  ...orchestrationTables,
  ...messagingTables,
  ...reviewsTables,
  ...userProfilesTables,
})
