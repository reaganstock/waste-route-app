import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new user (called when a user signs up via Clerk)
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Create a new team for admin users
    let teamId: Id<"teams"> | undefined;
    if (args.role === "admin") {
      teamId = await ctx.db.insert("teams", {
        name: `${args.name}'s Team`,
        createdBy: undefined as any, // Will update after user is created
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      status: "active",
      teamId,
      clerkId: args.clerkId,
    });

    // If user is admin, update the team's createdBy field
    if (teamId) {
      await ctx.db.patch(teamId, {
        createdBy: userId,
      });
    }

    return userId;
  },
});

// Get a user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();
  },
});

// Get a user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update a user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return userId;
  },
});

// Get all team members for a team
export const getTeamMembers = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();
  },
});

// Add a user to a team
export const addUserToTeam = mutation({
  args: {
    userId: v.id("users"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      teamId: args.teamId,
    });
    return args.userId;
  },
});

// Remove a user from a team
export const removeUserFromTeam = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      teamId: undefined,
    });
    return args.userId;
  },
}); 