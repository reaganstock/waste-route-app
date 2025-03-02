import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.string(), // "admin" or "driver"
    status: v.optional(v.string()), // "active" or "inactive"
    teamId: v.optional(v.id("teams")),
    avatarUrl: v.optional(v.string()),
    clerkId: v.string(), // ID from Clerk authentication
  }),

  // Teams table
  teams: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  }),

  // Routes table
  routes: defineTable({
    name: v.string(),
    teamId: v.id("teams"),
    assignedTo: v.optional(v.id("users")),
    status: v.string(), // "pending", "in_progress", "completed", "canceled"
    date: v.number(), // timestamp for route date
    startTime: v.optional(v.number()), // timestamp for start time
    endTime: v.optional(v.number()), // timestamp for end time
    duration: v.optional(v.number()), // in minutes
    description: v.optional(v.string()),
    totalHouses: v.number(),
    completedHouses: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  }),

  // Houses table
  houses: defineTable({
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    routeId: v.id("routes"),
    teamId: v.id("teams"),
    status: v.string(), // "pending", "collected", "skipped", "new_customer"
    notes: v.optional(v.string()),
    order: v.number(), // Order in the route
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  }),

  // RouteHistory table
  routeHistory: defineTable({
    routeId: v.id("routes"),
    userId: v.id("users"),
    teamId: v.id("teams"),
    action: v.string(), // "started", "completed", "paused", "resumed", "house_collected", "house_skipped"
    houseId: v.optional(v.id("houses")),
    timestamp: v.number(), // timestamp
    notes: v.optional(v.string()),
  }),
}); 