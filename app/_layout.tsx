import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Platform, Dimensions } from 'react-native';
import { AuthProvider } from '../src/contexts/AuthContext';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../src/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from '../src/components/ErrorBoundary';
import LoadingScreen from '../src/components/LoadingScreen';
import { router } from 'expo-router';

// Get device information
export const isTablet = () => {
  const { width, height } = Dimensions.get('window');
  const aspectRatio = height / width;
  return (
    Platform.OS === 'ios' && 
    Platform.isPad || 
    (aspectRatio <= 1.6 && Math.max(width, height) >= 900)
  );
};

// Export for use in components
export const DeviceInfo = {
  isTablet: isTablet()
};

// Disable warnings for iOS 18.4 compatibility
LogBox.ignoreLogs([
  'Require cycle:',
  'Constants.platform.ios.model has been deprecated',
  'FontAwesome icon library has already been cached.',
  'Non-serializable values were found in the navigation state',
]);

export function RootLayoutNav() {
  const { user, session, loading: authLoading } = useAuth();
  const segments = useSegments();
  const currentPath = segments.join('/');
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [loading, setLoading] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  // Initialize loading process with no delays at all
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hide splash screen immediately
        await SplashScreen.hideAsync().catch(e => console.log('Error hiding splash:', e));
        
        // Set loading to false right away
        setLoading(false);
        
        // Run onboarding check in background
        if (!authLoading) {
          setTimeout(() => {
            checkOnboardingStatus().catch(e => 
              console.log('Background onboarding check error:', e)
            );
          }, 100);
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
        setLoading(false);
      }
    };
    
    initializeApp();
  }, [authLoading, fontsLoaded]);

  useEffect(() => {
    if (!authLoading && !user && session?.user) {
      // Ensure user has a profile with timeout protection
      const ensureUserProfile = async () => {
        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile initialization timed out')), 10000)
        );
        
        // The actual profile initialization function
        const initProfilePromise = (async () => {
          try {
            console.log("Checking profile for user:", session.user.id);
            
            // Check if user already has teams
            const { data: existingTeams, error: teamError } = await supabase
              .from('teams')
              .select('id, name')
              .eq('owner_id', session.user.id);
            
            if (teamError) {
              console.error('Error checking existing teams:', teamError);
            } else if (existingTeams && existingTeams.length > 0) {
              console.log(`User already has ${existingTeams.length} teams:`, JSON.stringify(existingTeams, null, 2));
              
              // Use the first existing team
              const teamId = existingTeams[0].id;
              console.log(`Using existing team: ${teamId}`);
              
              // Ensure profile exists and has the correct team_id
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id, team_id')
                .eq('id', session.user.id)
                .maybeSingle();
                
              if (existingProfile) {
                console.log("Profile exists, updating team_id if needed");
                
                if (existingProfile.team_id !== teamId) {
                  await supabase
                    .from('profiles')
                    .update({ team_id: teamId })
                    .eq('id', session.user.id);
                }
              } else {
                // Get user metadata
                const fullName = session.user.user_metadata?.full_name || 'New User';
                console.log("Creating profile with existing team_id");
                
                await supabase
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    full_name: fullName,
                    email: session.user.email,
                    role: 'owner',
                    status: 'active',
                    team_id: teamId
                  });
              }
              
              // Ensure team membership exists
              const { data: membership } = await supabase
                .from('team_members')
                .select('id')
                .eq('profile_id', session.user.id)
                .eq('team_id', teamId)
                .maybeSingle();
                
              if (!membership) {
                console.log("Adding user to team_members");
                
                await supabase
                  .from('team_members')
                  .insert({
                    team_id: teamId,
                    profile_id: session.user.id
                  });
              }
              
              return;
            }
            
            // Get user metadata
            const fullName = session.user.user_metadata?.full_name || 'New User';
            const userRole = session.user.user_metadata?.role || 'owner';
            
            // Check if profile exists
            const { data, error } = await supabase
              .from('profiles')
              .select('id, team_id, role, full_name')
              .eq('id', session.user.id)
              .maybeSingle();
              
            if (error && error.code !== 'PGRST116') {
              console.error('Error checking profile:', error);
              return;
            }
            
            // If profile doesn't exist, create it
            if (!data) {
              console.log('No profile found for user, creating one:', session.user.id);
              
              // Create profile
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  full_name: fullName,
                  email: session.user.email,
                  role: userRole,
                  status: 'active'
                });
                
              if (insertError) {
                console.error('Error creating profile:', insertError);
                return;
              } else {
                console.log('Profile created successfully');
              }
              
              // Now create a team if user is an owner and no existing teams were found
              if (userRole === 'owner') {
                console.log('Creating team for owner user:', session.user.id);
                
                const { data: teamData, error: teamError } = await supabase
                  .from('teams')
                  .insert({
                    name: `${fullName}'s Team (${Date.now()})`, // Timestamp for uniqueness
                    owner_id: session.user.id,
                  })
                  .select()
                  .single();
                  
                if (teamError) {
                  console.error('Error creating team:', teamError);
                  return;
                }
                
                console.log('Created new team with ID:', teamData.id);
                
                // Update profile with team_id
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ team_id: teamData.id })
                  .eq('id', session.user.id);
                  
                if (updateError) {
                  console.error('Error updating profile with team_id:', updateError);
                  return;
                }
                
                // Add the user to team_members
                const { error: memberError } = await supabase
                  .from('team_members')
                  .insert({
                    team_id: teamData.id,
                    profile_id: session.user.id
                  });
                  
                if (memberError) {
                  console.error('Error adding user to team_members:', memberError);
                  return;
                }
                
                console.log('User added to newly created team');
              }
            } else {
              console.log('Profile exists for user:', session.user.id);
              
              // Profile exists but check if user is in team_members
              if (data.team_id) {
                const { data: membershipData } = await supabase
                  .from('team_members')
                  .select('id')
                  .eq('profile_id', session.user.id)
                  .eq('team_id', data.team_id)
                  .maybeSingle();
                  
                if (!membershipData) {
                  console.log('Adding user to team_members for existing team');
                  await supabase
                    .from('team_members')
                    .insert({
                      team_id: data.team_id,
                      profile_id: session.user.id
                    });
                }
              }
              // If owner with no team, create one
              else if (data.role === 'owner' && !data.team_id) {
                console.log('Owner without team, creating a unique team');
                
                const { data: teamData, error: teamError } = await supabase
                  .from('teams')
                  .insert({
                    name: `${data.full_name}'s Team (${Date.now()})`, // Timestamp for uniqueness
                    owner_id: session.user.id,
                  })
                  .select()
                  .single();
                  
                if (teamError) {
                  console.error('Error creating team:', teamError);
                  return;
                }
                
                console.log('Created new team with ID:', teamData.id);
                
                // Update profile with team_id
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ team_id: teamData.id })
                  .eq('id', session.user.id);
                  
                if (updateError) {
                  console.error('Error updating profile with team_id:', updateError);
                  return;
                }
                
                // Add the user to team_members
                const { error: memberError } = await supabase
                  .from('team_members')
                  .insert({
                    team_id: teamData.id,
                    profile_id: session.user.id
                  });
                  
                if (memberError) {
                  console.error('Error adding user to team_members:', memberError);
                  return;
                }
                
                console.log('User added to newly created team');
              }
            }
          } catch (error) {
            console.error("Error in profile initialization:", error);
            // Return something to resolve the promise even on error
            return null;
          }
        })();
        
        // Race between the initialization and the timeout
        try {
          await Promise.race([initProfilePromise, timeoutPromise]);
        } catch (error) {
          console.error("Profile initialization failed:", error);
        }
      };
      
      // Attempt to run the profile initialization
      ensureUserProfile().catch(error => {
        console.error("Unhandled error in profile initialization:", error);
      });
    }
  }, [authLoading, user, session]);

  // Handle authentication navigation
  useEffect(() => {
    if (authLoading || !fontsLoaded || loading) return;
    
    const checkNavigationState = async () => {
      try {
        // Check onboarding status
        const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
        console.log('Onboarding status:', onboardingComplete);
        
        // Handle navigation immediately without delay
        // First, handle onboarding
        if (segments[0] !== 'onboarding' && segments[0] !== '(auth)' && onboardingComplete !== 'true') {
          console.log('Onboarding not completed, redirecting to onboarding');
          router.replace('/onboarding');
          return;
        }
        
        // Then handle auth states
        if (!user && segments[0] !== '(auth)' && segments[0] !== 'onboarding') {
          console.log('User not authenticated, redirecting to auth');
          router.replace('/(auth)');
        } else if (user && segments[0] === '(auth)') {
          console.log('User authenticated, redirecting to tabs');
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('Error checking navigation state:', error);
      }
    };
    
    checkNavigationState();
  }, [user, authLoading, segments, router, fontsLoaded, loading]);

  // One-time cleanup on app start
  useEffect(() => {
    const cleanupDatabase = async () => {
      try {
        console.log("Running one-time cleanup for duplicate teams");
        
        // 1. Get all users
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, team_id, role, full_name');
          
        if (profileError) {
          console.error("Error fetching profiles:", profileError);
          return;
        }
        
        console.log(`Found ${profiles.length} profiles to check`);
        
        // 2. For each user, ensure they have only one team membership
        for (const profile of profiles) {
          if (!profile.team_id) {
            console.log(`Profile ${profile.id} has no team_id, skipping`);
            continue;
          }
          
          // Check team memberships
          const { data: memberships, error: memberError } = await supabase
            .from('team_members')
            .select('id, team_id')
            .eq('profile_id', profile.id);
            
          if (memberError) {
            console.error(`Error fetching memberships for profile ${profile.id}:`, memberError);
            continue;
          }
          
          if (!memberships || memberships.length === 0) {
            // No memberships, add one
            console.log(`Profile ${profile.id} has no team memberships, adding one for team ${profile.team_id}`);
            await supabase
              .from('team_members')
              .insert({
                profile_id: profile.id,
                team_id: profile.team_id
              });
          } else if (memberships.length > 1) {
            // Multiple memberships, clean up
            console.log(`Profile ${profile.id} has ${memberships.length} memberships, cleaning up...`);
            
            for (const membership of memberships) {
              if (membership.team_id !== profile.team_id) {
                console.log(`Deleting incorrect membership: ${membership.id} (team: ${membership.team_id})`);
                await supabase
                  .from('team_members')
                  .delete()
                  .eq('id', membership.id);
              }
            }
          } else if (memberships[0].team_id !== profile.team_id) {
            // Single membership but for the wrong team
            console.log(`Profile ${profile.id} has incorrect team membership, fixing...`);
            await supabase
              .from('team_members')
              .update({ team_id: profile.team_id })
              .eq('id', memberships[0].id);
          } else {
            console.log(`Profile ${profile.id} team memberships are correct`);
          }
        }
        
        console.log("Team membership cleanup complete");
      } catch (error) {
        console.error("Error in database cleanup:", error);
      }
    };
    
    cleanupDatabase();
  }, []);

  async function checkOnboardingStatus() {
    try {
      // Check if onboarding has been completed
      const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
      console.log('Checking onboarding status:', onboardingComplete);
      
      // We only set the state and don't navigate here
      // Navigation will happen in the useEffect that depends on this state
      if (!onboardingComplete) {
        // Mark that we need to show onboarding
        console.log('Onboarding needs to be shown');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  }

  // Show the loading screen while the app is initializing
  if (loading || authLoading || !fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="(auth)" 
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen 
          name="onboarding" 
          options={{
            presentation: 'card',
            animation: 'fade',
            gestureEnabled: false
          }}
        />
        <Stack.Screen 
          name="active-routes" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="upcoming-routes" 
          options={{ 
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen name="route" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="support" />
        <Stack.Screen name="updates" />
        <Stack.Screen name="profile-details" />
        <Stack.Screen name="route-create" />
        <Stack.Screen name="map" />
        <Stack.Screen name="route/[id]/completion" options={{ 
          presentation: 'card',
          gestureEnabled: false,
          headerShown: false,
          animation: 'none',
          contentStyle: {
            backgroundColor: '#000'
          }
        }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ErrorBoundary>
  );
}

