import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { ClerkProvider, ClerkLoaded, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useSegments } from 'expo-router';
import { tokenCache } from '../src/lib/tokenCache';
import { convex } from '../convex';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useUser } from '@clerk/clerk-expo';
import { ActivityIndicator, View, Text } from 'react-native';

// Get the Clerk publishable key from environment variables
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable');
}

// Root layout component
export default function RootLayout() {
  console.log('Clerk publishable key:', CLERK_PUBLISHABLE_KEY);
  
  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

// Navigation component that handles authentication routing
function RootLayoutNav() {
  // Remove all the complex navigation logic that's causing loops
  // Just render the Stack and let the individual layouts handle their own auth checks
  
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
