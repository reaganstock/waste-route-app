import { ConvexReactClient } from "convex/react";

// Initialize Convex client
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL environment variable");
}

export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
}); 