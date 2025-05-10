import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "../contexts/AuthContext";

// User functions
export function useCurrentUser() {
  const { user } = useAuth();
  const clerkId = user?.id;
  const convexUser = useQuery(api.users.getUserByClerkId, 
    clerkId ? { clerkId } : "skip"
  );
  return convexUser;
}

// Route functions
export function useRoutes(teamId: Id<"teams"> | undefined, status?: string) {
  return useQuery(api.routes.getTeamRoutes, 
    teamId ? { 
      teamId, 
      status: status || "all" 
    } : "skip"
  );
}

export function useUserRoutes(userId: Id<"users"> | undefined, status?: string) {
  return useQuery(api.routes.getUserRoutes, 
    userId ? { 
      userId, 
      status: status || "all" 
    } : "skip"
  );
}

export function useRoute(routeId: Id<"routes"> | undefined) {
  return useQuery(api.routes.getRoute, 
    routeId ? { routeId } : "skip"
  );
}

export function useRouteHistory(routeId: Id<"routes"> | undefined) {
  return useQuery(api.routes.getRouteHistory, 
    routeId ? { routeId } : "skip"
  );
}

// Mutation helpers
export function useUpdateRouteStatus() {
  return useMutation(api.routes.updateRouteStatus);
}

export function useUpdateHouseStatus() {
  return useMutation(api.routes.updateHouseStatus);
}

export function useCreateRoute() {
  return useMutation(api.routes.createRoute);
}

export function useAddHouse() {
  return useMutation(api.routes.addHouse);
}

// Team functions
export function useTeam(teamId: Id<"teams"> | undefined) {
  return useQuery(api.teams.getTeam, 
    teamId ? { teamId } : "skip"
  );
}

export function useTeamMembers(teamId: Id<"teams"> | undefined) {
  return useQuery(api.users.getTeamMembers, 
    teamId ? { teamId } : "skip"
  );
}

export function useTeamStats(teamId: Id<"teams"> | undefined) {
  return useQuery(api.teams.getTeamStats, 
    teamId ? { teamId } : "skip"
  );
}

// Other mutations
export function useAddUserToTeam() {
  return useMutation(api.users.addUserToTeam);
}

export function useRemoveUserFromTeam() {
  return useMutation(api.users.removeUserFromTeam);
}

export function useUpdateUser() {
  return useMutation(api.users.updateUser);
}

export function useCreateTeam() {
  return useMutation(api.teams.createTeam);
}

export function useUpdateTeam() {
  return useMutation(api.teams.updateTeam);
} 