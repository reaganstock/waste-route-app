import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, deleteUserWithManagementAPI } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// Enhanced error handling to prevent crashes on iOS and Android
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  // Patch the global error handler to prevent unhandled promise rejections from crashing the app
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Prevent React Native's ExceptionsManager from crashing the app
    if (args[0] && typeof args[0] === 'string' && 
       (args[0].includes('Unhandled promise rejection') || 
        args[0].includes('ExceptionsManager') ||
        args[0].includes('NetInfo') ||
        args[0].includes('AsyncStorage'))) {
      // Log the error but don't crash
      console.log('Suppressed error for stability:', ...args);
    } else {
      originalConsoleError(...args);
    }
  };

  // Add global rejection handler
  if (typeof global !== 'undefined') {
    const globalHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      console.log('Prevented app crash from unhandled rejection:', event.reason);
    };

    // Add event listener safely
    try {
      if (global.addEventListener) {
        global.addEventListener('unhandledrejection', globalHandler);
      }
    } catch (e) {
      console.log('Could not add unhandledrejection listener:', e);
    }
  }
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, businessName: string | null, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean, message?: string, error?: unknown }>;
  deleteAccount: () => Promise<{ success: boolean, message?: string, error?: unknown }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch and enrich user data with profile data
  const fetchUserProfile = async (currentUser: User | null) => {
    console.log("[fetchUserProfile] Called for user:", currentUser?.id ?? 'null');
    if (!currentUser) {
      setUser(null);
      setLoading(false);
      console.log("[fetchUserProfile] No current user, setting user to null.");
      return;
    }

    try {
      setLoading(true); // Ensure loading is true while fetching
      console.log(`[fetchUserProfile] Fetching profile and memberships for user: ${currentUser.id}`);

      // Fetch profile and team memberships concurrently
      const [profileResult, membershipResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase.from('team_members').select('team_id').eq('profile_id', currentUser.id)
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: memberships, error: membershipError } = membershipResult;

      if (profileError) {
        console.error('[fetchUserProfile] Error fetching profile:', profileError);
        // If profile fetch fails, we can't do much else, maybe fallback?
        setUser(currentUser); // Set basic user object
        setLoading(false);
        return;
      }

      if (membershipError) {
        // Log error but potentially continue if profile exists
        console.error('[fetchUserProfile] Error fetching team memberships:', membershipError);
      }

      console.log(`[fetchUserProfile] Profile fetched:`, profile ? JSON.stringify(profile) : 'null');
      console.log(`[fetchUserProfile] Memberships fetched:`, memberships ? JSON.stringify(memberships) : 'null');

      let finalTeamId: string | null = null;
      let userProfile = profile;

      // Scenario 1: Profile doesn't exist -> Create it
      if (!userProfile) {
        console.log(`[fetchUserProfile] Profile not found for user ${currentUser.id}. Creating one.`);
        // Attempt to create profile (pass role from auth metadata)
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || 'New User',
            email: currentUser.email,
            role: currentUser.user_metadata?.role || 'driver', // Default to driver if not specified
            status: 'active',
            team_id: null // Start with null team_id
          })
          .select()
          .single();

        if (createError) {
          console.error('[fetchUserProfile] Error creating profile:', createError);
          setUser(currentUser); // Fallback to basic user
          setLoading(false);
          return;
        } else {
          userProfile = createdProfile;
          console.log(`[fetchUserProfile] Profile created successfully:`, userProfile);
        }
      }

      // Now determine the team ID based on profile and memberships
      if (userProfile.team_id) {
        // Priority 1: Use team_id directly from profile if it exists
        finalTeamId = userProfile.team_id;
        console.log(`[fetchUserProfile] Using team_id from profile: ${finalTeamId}`);

        // Ensure membership exists for this team_id
        const correctMembershipExists = memberships?.some(m => m.team_id === finalTeamId);
        if (!correctMembershipExists) {
          console.warn(`[fetchUserProfile] Profile has team_id ${finalTeamId}, but no matching membership found. Adding membership.`);
          const { error: insertErr } = await supabase.from('team_members').insert({ team_id: finalTeamId, profile_id: currentUser.id });
          if (insertErr) console.error("[fetchUserProfile] Error inserting missing membership:", insertErr);
        }

      } else if (memberships && memberships.length > 0) {
        // Priority 2: Profile has no team_id, check memberships
        if (memberships.length === 1) {
          // Exactly one membership found, use it and update profile
          finalTeamId = memberships[0].team_id;
          console.log(`[fetchUserProfile] Found single membership for team_id ${finalTeamId}. Updating profile.`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ team_id: finalTeamId })
            .eq('id', currentUser.id);
          if (updateError) {
            console.error('[fetchUserProfile] Error updating profile with team_id from membership:', updateError);
            // Proceed using the team_id found, even if profile update failed
          } else {
            userProfile.team_id = finalTeamId; // Update local profile object
          }
        } else {
          // Multiple memberships found, this is ambiguous. Log error and maybe pick the first?
          console.warn(`[fetchUserProfile] User ${currentUser.id} is in multiple (${memberships.length}) teams but has no team_id set in profile. Using the first one found: ${memberships[0].team_id}.`);
          finalTeamId = memberships[0].team_id;
          // Optionally update profile here too, or leave as is?
           const { error: updateError } = await supabase
             .from('profiles')
             .update({ team_id: finalTeamId })
             .eq('id', currentUser.id);
           if (!updateError) userProfile.team_id = finalTeamId;
        }
      } else {
        // Priority 3: No team_id in profile, no memberships found.
        console.log(`[fetchUserProfile] User ${currentUser.id} has no team_id in profile and no memberships.`);
        // If user is an owner, they might need a team created (handled in signUp or separate flow)
        // For now, finalTeamId remains null for drivers.
         if (userProfile.role === 'owner') {
             console.log("[fetchUserProfile] User is owner, checking if they own a team...");
             // Check if they own any team
             const { data: ownedTeam, error: ownedTeamError } = await supabase
                .from('teams')
                .select('id')
                .eq('owner_id', currentUser.id)
                .limit(1)
                .maybeSingle();

             if (ownedTeamError) {
                 console.error("[fetchUserProfile] Error checking owned team:", ownedTeamError);
             } else if (ownedTeam) {
                 finalTeamId = ownedTeam.id;
                 console.log(`[fetchUserProfile] Owner owns team ${finalTeamId}. Updating profile and adding membership.`);
                 // Update profile and add membership (similar to above)
                 await supabase.from('profiles').update({ team_id: finalTeamId }).eq('id', currentUser.id);
                 await supabase.from('team_members').insert({ team_id: finalTeamId, profile_id: currentUser.id });
                 userProfile.team_id = finalTeamId; // Update local profile object
             } else {
                 console.log("[fetchUserProfile] Owner has no team yet.");
                 // Team creation should happen during signup ideally.
             }
         }
      }

      // Clean up memberships if necessary (ensure only membership for finalTeamId exists)
      if (finalTeamId && memberships) {
          console.log(`[fetchUserProfile] Cleaning memberships, ensuring only team ${finalTeamId} exists.`);
          for (const membership of memberships) {
              if (membership.team_id !== finalTeamId) {
                  console.log(`[fetchUserProfile] Deleting incorrect membership for team ${membership.team_id}`);
                  await supabase.from('team_members').delete().eq('profile_id', currentUser.id).eq('team_id', membership.team_id);
              }
          }
      }

      // Construct the final user object
      const enrichedUser = {
        ...currentUser,
        team_id: finalTeamId, // Add team_id directly to user object
        profile: {
          ...userProfile,
          team_id: finalTeamId // Ensure profile within user object also has it
        }
      };

      console.log(`[fetchUserProfile] Setting final user state for ${currentUser.id}:`, JSON.stringify(enrichedUser));
      setUser(enrichedUser as User);

    } catch (error) {
      console.error('[fetchUserProfile] Uncaught error:', error);
      setUser(currentUser); // Fallback to basic user object on unexpected errors
    } finally {
      setLoading(false);
      console.log("[fetchUserProfile] Fetch complete, loading set to false.");
    }
  };

  // Helper function to create a new profile
  const createNewProfile = async (currentUser: User | null, teamId: string | null) => {
    if (!currentUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('Creating new profile for user:', currentUser.id);
      
      // First check if profile already exists to avoid duplicate key errors
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking for existing profile:', checkError);
      } else if (existingProfile) {
        console.log('Profile already exists, using existing profile:', existingProfile);
        
        // Update the user with the existing profile
        const enrichedUser = {
          ...currentUser,
          team_id: existingProfile.team_id,
          profile: existingProfile
        };
        
        setUser(enrichedUser as User);
        setLoading(false);
        return;
      }
      
      // See if user owns any teams first
      const { data: ownedTeams, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', currentUser.id);
        
      if (teamError) {
        console.error('Error checking for owned teams:', teamError);
      }
      
      const finalTeamId = teamId || (ownedTeams && ownedTeams.length > 0 ? ownedTeams[0].id : null);
      
      // Try to create a profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || 'New User',
          email: currentUser.email,
          role: currentUser.user_metadata?.role || 'owner',
          status: 'active',
          team_id: finalTeamId
        })
        .select()
        .single();
        
      if (createError) {
        console.error('Error creating profile:', createError);
        
        // If error is duplicate key, fetch the existing profile
        if (createError.code === '23505') { // PostgreSQL duplicate key error
          console.log('Profile already exists (duplicate key), fetching existing profile');
          
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
          if (fetchError) {
            console.error('Error fetching existing profile:', fetchError);
            setUser(currentUser); // Fall back to basic user object
          } else {
            console.log('Fetched existing profile:', existingProfile);
            
            // Update the user with the existing profile
            const enrichedUser = {
              ...currentUser,
              team_id: existingProfile.team_id,
              profile: existingProfile
            };
            
            setUser(enrichedUser as User);
          }
        } else {
          setUser(currentUser); // Fall back to basic user object
        }
      } else {
        console.log('Profile created successfully:', newProfile);
        
        // If we have a team ID, ensure user is in team_members
        if (finalTeamId) {
          const { error: memberError } = await supabase
            .from('team_members')
            .insert({
              team_id: finalTeamId,
              profile_id: currentUser.id
            });
            
          if (memberError) {
            console.error('Error adding user to team_members:', memberError);
          }
        } else if (currentUser.user_metadata?.role === 'owner') {
          // Owner without a team, create one
          console.log("Creating a team for new owner");
          const teamName = `${newProfile.full_name}'s Team`;
          
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .insert({
              name: teamName,
              owner_id: currentUser.id,
            })
            .select()
            .single();
            
          if (teamError) {
            console.error('Team creation error:', teamError);
          } else {
            console.log("Team created with ID:", teamData.id);
            
            // Update profile with team_id
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ team_id: teamData.id })
              .eq('id', currentUser.id);
            
            if (updateError) {
              console.error('Error updating profile with team_id:', updateError);
            }
            
            // Add to team_members
            const { error: memberError } = await supabase
              .from('team_members')
              .insert({
                team_id: teamData.id,
                profile_id: currentUser.id
              });
            
            if (memberError) {
              console.error('Error adding user to team_members:', memberError);
            }
            
            newProfile.team_id = teamData.id;
          }
        }
        
        // Create enriched user
        const enrichedUser = {
          ...currentUser,
          team_id: newProfile.team_id,
          profile: newProfile
        };
        
        setUser(enrichedUser as User);
      }
    } catch (error) {
      console.error('Error in createNewProfile:', error);
      setUser(currentUser); // Fall back to basic user object
    }
    
    setLoading(false);
  };

  // Helper function to clean up duplicate team memberships
  const cleanupTeamMemberships = async (userId: string, correctTeamId: string | null) => {
    if (!correctTeamId) {
      console.log("No correct team ID, skipping cleanup");
      return;
    }
    
    try {
      console.log(`Cleaning up team memberships for user ${userId} (correct team: ${correctTeamId})`);
      
      // Fetch all team memberships for this user
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select('id, team_id')
        .eq('profile_id', userId);
        
      if (error) {
        console.error("Error fetching team memberships:", error);
        return;
      }
      
      if (!memberships || memberships.length === 0) {
        console.log("No team memberships found");
        return;
      }
      
      console.log(`Found ${memberships.length} team memberships`);
      
      // If there's more than one team membership or the team ID doesn't match the correct one
      if (memberships.length > 1 || memberships[0].team_id !== correctTeamId) {
        console.log("Cleaning up inconsistent team memberships...");
        
        // Delete all team memberships except the correct one
        for (const membership of memberships) {
          if (membership.team_id !== correctTeamId) {
            console.log(`Deleting incorrect team membership: ${membership.id} (team: ${membership.team_id})`);
            await supabase
              .from('team_members')
              .delete()
              .eq('id', membership.id);
          }
        }
        
        // Ensure the user is a member of the correct team
        const { data: correctMembership } = await supabase
          .from('team_members')
          .select('id')
          .eq('profile_id', userId)
          .eq('team_id', correctTeamId)
          .maybeSingle();
          
        if (!correctMembership) {
          console.log(`Adding user to correct team: ${correctTeamId}`);
          await supabase
            .from('team_members')
            .insert({
              profile_id: userId,
              team_id: correctTeamId
            });
        }
      } else {
        console.log("Team memberships are consistent, no cleanup needed");
      }
    } catch (error) {
      console.error("Error in cleanupTeamMemberships:", error);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await fetchUserProfile(session?.user ?? null);
      
      // Debug current state of teams
      if (session?.user) {
        debugTeamState(session.user.id);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      await fetchUserProfile(session?.user ?? null);
      
      // Debug current state of teams
      if (session?.user) {
        debugTeamState(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to debug team state
  const debugTeamState = async (userId: string) => {
    try {
      console.log("Debugging team state for user:", userId);
      
      // Check profiles for this user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, team_id, role, full_name')
        .eq('id', userId)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (!profile) {
        console.log("No profile found for user");
      } else {
        console.log("Profile:", JSON.stringify(profile, null, 2));
      }
      
      // Check team memberships
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('team_id, teams:team_id(name, owner_id)')
        .eq('profile_id', userId);
        
      if (teamError) {
        console.error("Error fetching team memberships:", teamError);
      } else if (!teamMembers || teamMembers.length === 0) {
        console.log("User is not a member of any teams");
      } else {
        console.log(`User is a member of ${teamMembers.length} teams:`, JSON.stringify(teamMembers, null, 2));
      }
      
      // Check owned teams
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('owner_id', userId);
        
      if (ownedError) {
        console.error("Error fetching owned teams:", ownedError);
      } else if (!ownedTeams || ownedTeams.length === 0) {
        console.log("User doesn't own any teams");
      } else {
        console.log(`User owns ${ownedTeams.length} teams:`, JSON.stringify(ownedTeams, null, 2));
      }
    } catch (error) {
      console.error("Error in debugTeamState:", error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with email:', email);
      
      // Check if the email is in the deleted_accounts table
      const { data: deletedAccount } = await supabase
        .from('deleted_accounts')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
        
      if (deletedAccount) {
        console.log('Attempt to sign in with deleted account:', email);
        Alert.alert(
          'Account Deleted',
          'This account has been deleted. Please create a new account to continue.'
        );
        // Return early without attempting sign in
        return;
      }
      
      // Log more details about the environment
      console.log('Environment:', {
        platform: Platform.OS,
        appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'undefined',
        hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL, 
        hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        constHasExtra: !!Constants.expoConfig?.extra,
        constHasSupabaseUrl: !!Constants.expoConfig?.extra?.supabaseUrl,
        constHasSupabaseKey: !!Constants.expoConfig?.extra?.supabaseAnonKey,
      });
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error details:', error);
        
        // More specific error handling based on error code
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert(
            'Invalid Credentials',
            'The email or password you entered is incorrect. Please try again.'
          );
        } else if (error.message.includes('API key')) {
          Alert.alert(
            'Configuration Error',
            'There was a problem with the app configuration. Please contact support.'
          );
          console.error('API key error - full error:', JSON.stringify(error));
        } else {
          Alert.alert(
            'Sign In Error',
            `Could not sign in: ${error.message}. Please check your internet connection and try again.`
          );
        }
        
        throw error;
      }
      
      console.log('Sign in successful, session established');
    } catch (error) {
      console.error('Sign in exception:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, businessName: string | null, role: string) => {
    try {
      console.log(`Starting signup process for role: ${role}...`);
      
      // Register the user with Supabase Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('No user returned from signup');
      }

      const newUser = data.user;
      console.log(`User registered with Auth (ID: ${newUser.id}, Role: ${role})`);

      // Wait for a brief moment to ensure auth is complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if user already has teams or profiles
      const { data: existingTeams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('owner_id', newUser.id);
        
      if (existingTeams && existingTeams.length > 0) {
        console.log(`User already has ${existingTeams.length} teams:`, JSON.stringify(existingTeams, null, 2));
        
        // Use the first existing team
        const teamId = existingTeams[0].id;
        console.log(`Using existing team: ${teamId}`);
        
        // Ensure profile exists and has the correct team_id
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, team_id')
          .eq('id', newUser.id)
          .maybeSingle();
          
        if (existingProfile) {
          console.log("Profile exists, updating team_id if needed");
          
          if (existingProfile.team_id !== teamId) {
            await supabase
              .from('profiles')
              .update({ team_id: teamId })
              .eq('id', newUser.id);
          }
        } else {
          console.log("Creating profile with existing team_id");
          
          await supabase
            .from('profiles')
            .insert({
              id: newUser.id,
              full_name: fullName,
              email,
              role: role,
              status: 'active',
              team_id: teamId
            });
        }
        
        // Ensure team membership exists
        const { data: existingMembership } = await supabase
          .from('team_members')
          .select('id')
          .eq('profile_id', newUser.id)
          .eq('team_id', teamId)
          .maybeSingle();
          
        if (!existingMembership) {
          console.log("Adding user to team_members");
          
          await supabase
            .from('team_members')
            .insert({
              team_id: teamId,
              profile_id: newUser.id
            });
        }
        
        return;
      }
      
      // --- Logic for NEW users without existing teams ---

      // Create the profile first (without team_id initially for owners, drivers always start without team_id)
      console.log("Creating new profile...");
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          full_name: fullName,
          email,
          role: role,
          status: 'active',
          team_id: null // Start with null team_id
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // If it's a duplicate error, maybe try fetching the profile again?
        throw profileError;
      } else {
        console.log("Profile created successfully:", newProfile);
      }

      // If the role is 'owner', create a team and link it
      if (role === 'owner') {
        console.log("Creating a team for the new owner...");
        // Use businessName if provided, otherwise generate one
        const teamName = businessName || `${fullName}'s Team (${Date.now()})`;

        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            owner_id: newUser.id, // Link team to the new user
          })
          .select()
          .single();

        if (teamError) {
          console.error('Team creation error:', teamError);
          throw teamError;
        }

        console.log("Team created successfully with ID:", teamData.id);

        // Update the owner's profile with the new team_id
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ team_id: teamData.id })
          .eq('id', newUser.id);

        if (updateError) {
          console.error('Error updating profile with team_id:', updateError);
          // Profile exists, but team linking failed. Might need manual fix.
          throw updateError;
        }

        // Add the owner to their own team in team_members
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamData.id,
            profile_id: newUser.id
          });

        if (memberError) {
          console.error('Error adding owner to team_members:', memberError);
          // Team and profile exist, but membership link failed.
          throw memberError;
        }

        console.log("Owner successfully linked to new team and added to team_members.");

      } else {
        // Role is 'driver', no team creation needed here.
        console.log("Driver signed up. No team created automatically.");
      }

    } catch (error) {
      console.error('Overall signup error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'waste-route://reset-password',
    });

    if (error) throw error;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user) {
        return { success: false, message: 'No user is currently logged in' };
      }
      
      // First verify the current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email as string,
        password: currentPassword,
      });
      
      if (signInError) {
        return { success: false, message: 'Current password is incorrect' };
      }
      
      // If sign-in is successful, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        throw updateError;
      }
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, error, message: 'Failed to update password' };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        throw new Error('No user is currently logged in');
      }
      
      console.log('Starting account deletion process for user ID:', user.id);
      const userEmail = user.email;
      
      // Step 1: Delete team_members entries
      const { error: memberDeleteError } = await supabase
        .from('team_members')
        .delete()
        .eq('profile_id', user.id);
        
      if (memberDeleteError) {
        console.error('Error deleting team memberships:', memberDeleteError);
      } else {
        console.log('Successfully deleted team memberships');
      }
      
      // Step 2: Check if user is a team owner and handle team deletion
      const { data: ownedTeams, error: teamFetchError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id);
        
      if (!teamFetchError && ownedTeams && ownedTeams.length > 0) {
        console.log(`User owns ${ownedTeams.length} teams. Deleting them...`);
        // Transfer or delete the team based on your business logic
        // For simplicity, we're deleting the team
        for (const team of ownedTeams) {
          // Delete all members of the team
          const { error: teamMemberDeleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('team_id', team.id);
            
          if (teamMemberDeleteError) {
            console.error(`Error deleting members for team ${team.id}:`, teamMemberDeleteError);
          } else {
            console.log(`Successfully deleted members for team ${team.id}`);
          }
            
          // Delete the team itself
          const { error: teamDeleteError } = await supabase
            .from('teams')
            .delete()
            .eq('id', team.id);
            
          if (teamDeleteError) {
            console.error(`Error deleting team ${team.id}:`, teamDeleteError);
          } else {
            console.log(`Successfully deleted team ${team.id}`);
          }
        }
      } else {
        console.log('User does not own any teams or there was an error fetching teams');
      }
      
      // Step 3: Create a record in deleted_accounts to prevent future sign-ins with this email
      if (userEmail) {
        const { error: blockedError } = await supabase
          .from('deleted_accounts')
          .upsert([
            { 
              email: userEmail.toLowerCase(),
              user_id: user.id,
              deleted_at: new Date().toISOString()
            }
          ]);
          
        if (blockedError) {
          console.error('Error adding email to blocked list:', blockedError);
        } else {
          console.log('Added email to deleted accounts list:', userEmail);
        }
      }
      
      // Step 4: Delete profile
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
        
      if (profileDeleteError) {
        console.error('Error deleting profile:', profileDeleteError);
      } else {
        console.log('Successfully deleted user profile');
      }
      
      // Step 5: Sign out
      try {
        await signOut();
        console.log('User signed out after account deletion');
      } catch (signOutError) {
        console.error('Error signing out after account deletion:', signOutError);
      }
      
      return { success: true, message: 'Account successfully deleted' };
    } catch (error) {
      console.error('Error in account deletion process:', error);
      return { success: false, error, message: 'There was a problem deleting your account. Please try again.' };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    changePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 