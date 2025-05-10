import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new route
export const createRoute = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    teamId: v.id("teams"),
    assignedTo: v.optional(v.id("users")),
    date: v.number(),
    totalHouses: v.number(),
    userId: v.id("users"), // Creator ID
  },
  handler: async (ctx, args) => {
    const { userId, ...routeData } = args;
    
    const routeId = await ctx.db.insert("routes", {
      ...routeData,
      status: "pending",
      completedHouses: 0,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Add entry to route history
    await ctx.db.insert("routeHistory", {
      routeId,
      userId,
      teamId: args.teamId,
      action: "created",
      timestamp: Date.now(),
    });
    
    return routeId;
  },
});

// Add a house to a route
export const addHouse = mutation({
  args: {
    address: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    routeId: v.id("routes"),
    teamId: v.id("teams"),
    status: v.string(),
    notes: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const houseId = await ctx.db.insert("houses", {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Update the total houses count on the route
    const route = await ctx.db.get(args.routeId);
    await ctx.db.patch(args.routeId, {
      totalHouses: (route?.totalHouses || 0) + 1,
      updatedAt: Date.now(),
    });
    
    return houseId;
  },
});

// Get all routes for a team
export const getTeamRoutes = query({
  args: { 
    teamId: v.id("teams"),
    status: v.optional(v.union(v.literal("all"), v.string())),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("teamId"), args.teamId));
    
    if (args.status && args.status !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query
      .order("desc")
      .collect();
  },
});

// Get routes assigned to a user
export const getUserRoutes = query({
  args: { 
    userId: v.id("users"),
    status: v.optional(v.union(v.literal("all"), v.string())),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("assignedTo"), args.userId));
    
    if (args.status && args.status !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query
      .order("desc")
      .collect();
  },
});

// Get a single route with its houses
export const getRoute = query({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) return null;
    
    const houses = await ctx.db
      .query("houses")
      .filter((q) => q.eq(q.field("routeId"), args.routeId))
      .order("order", "asc")
      .collect();
    
    return { ...route, houses };
  },
});

// Update a route's status
export const updateRouteStatus = mutation({
  args: {
    routeId: v.id("routes"),
    status: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) throw new Error("Route not found");
    
    const updates: Partial<Doc<"routes">> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    
    // If starting the route, record the start time
    if (args.status === "in_progress" && route.status !== "in_progress") {
      updates.startTime = Date.now();
    }
    
    // If completing the route, record the end time and calculate duration
    if (args.status === "completed" && route.status !== "completed") {
      updates.endTime = Date.now();
      if (route.startTime) {
        updates.duration = Math.floor((updates.endTime - route.startTime) / (1000 * 60)); // in minutes
      }
    }
    
    await ctx.db.patch(args.routeId, updates);
    
    // Add entry to route history
    await ctx.db.insert("routeHistory", {
      routeId: args.routeId,
      userId: args.userId,
      teamId: route.teamId,
      action: args.status === "in_progress" ? "started" : 
             args.status === "completed" ? "completed" : 
             args.status === "paused" ? "paused" : "updated",
      timestamp: Date.now(),
    });
    
    return args.routeId;
  },
});

// Update a house's status
export const updateHouseStatus = mutation({
  args: {
    houseId: v.id("houses"),
    status: v.string(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const house = await ctx.db.get(args.houseId);
    if (!house) throw new Error("House not found");
    
    const updates: Partial<Doc<"houses">> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    
    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }
    
    await ctx.db.patch(args.houseId, updates);
    
    // If status is 'collected' or 'skipped', increment completedHouses on the route
    if (args.status === "collected" || args.status === "skipped") {
      const route = await ctx.db.get(house.routeId);
      if (route && house.status !== "collected" && house.status !== "skipped") {
        await ctx.db.patch(house.routeId, {
          completedHouses: (route.completedHouses || 0) + 1,
          updatedAt: Date.now(),
        });
      }
    }
    
    // Add entry to route history
    await ctx.db.insert("routeHistory", {
      routeId: house.routeId,
      userId: args.userId,
      teamId: house.teamId,
      houseId: args.houseId,
      action: args.status === "collected" ? "house_collected" : 
             args.status === "skipped" ? "house_skipped" : "house_updated",
      timestamp: Date.now(),
      notes: args.notes,
    });
    
    return args.houseId;
  },
});

// Get route history
export const getRouteHistory = query({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("routeHistory")
      .filter((q) => q.eq(q.field("routeId"), args.routeId))
      .order("desc")
      .collect();
    
    // For each history item, get the user and house (if applicable)
    const enhancedHistory = await Promise.all(history.map(async (item) => {
      const user = item.userId ? await ctx.db.get(item.userId) : null;
      const house = item.houseId ? await ctx.db.get(item.houseId) : null;
      
      return {
        ...item,
        user: user ? { _id: user._id, name: user.name } : null,
        house: house ? { _id: house._id, address: house.address } : null,
      };
    }));
    
    return enhancedHistory;
  },
});

// Get completed routes for a team
export const getCompletedTeamRoutes = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .filter((q) => q.gt(q.field("totalHouses"), 0))
      .collect();
    
    return routes;
  },
});

// Get completed routes for a user
export const getCompletedUserRoutes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("assignedTo"), args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .filter((q) => q.gt(q.field("totalHouses"), 0))
      .collect();
    
    return routes;
  },
});

// Get all routes for a team (for metrics calculations)
export const getAllTeamRoutes = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const routes = await ctx.db
      .query("routes")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();
    
    return routes;
  },
}); 