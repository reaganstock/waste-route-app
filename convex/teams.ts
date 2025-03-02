import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new team
export const createTeam = mutation({
  args: {
    name: v.string(),
    userId: v.id("users"), // Admin user ID
  },
  handler: async (ctx, args) => {
    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Assign the creator to the team
    await ctx.db.patch(args.userId, {
      teamId: teamId,
    });
    
    return teamId;
  },
});

// Get a team by ID
export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

// Get a user's team
export const getUserTeam = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.teamId) return null;
    
    return await ctx.db.get(user.teamId);
  },
});

// Update a team
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.teamId, {
      name: args.name,
      updatedAt: Date.now(),
    });
    return args.teamId;
  },
});

// Get team statistics
export const getTeamStats = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Get all routes for the team
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();
    
    // Get active team members
    const members = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();
    
    const activeMembers = members.filter(m => m.status === "active").length;
    
    // Count routes by status
    const routesByStatus = routes.reduce((acc, route) => {
      acc[route.status] = (acc[route.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Total completed houses
    const totalHouses = routes.reduce((acc, route) => acc + (route.totalHouses || 0), 0);
    const completedHouses = routes.reduce((acc, route) => acc + (route.completedHouses || 0), 0);
    
    // Total hours driven (from completed routes)
    const totalMinutesDriven = routes
      .filter(r => r.status === "completed" && r.duration)
      .reduce((acc, route) => acc + (route.duration || 0), 0);
    
    return {
      totalRoutes: routes.length,
      activeRoutes: routesByStatus["in_progress"] || 0,
      completedRoutes: routesByStatus["completed"] || 0,
      pendingRoutes: routesByStatus["pending"] || 0,
      canceledRoutes: routesByStatus["canceled"] || 0,
      totalMembers: members.length,
      activeMembers,
      totalHouses,
      completedHouses,
      houseCompletionRate: totalHouses > 0 ? completedHouses / totalHouses : 0,
      totalHoursDriven: Math.round(totalMinutesDriven / 60 * 10) / 10, // Hours with 1 decimal place
    };
  },
}); 