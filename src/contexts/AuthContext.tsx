import React, { createContext, useState, useContext, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

type AuthContextType = {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ success: boolean, error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean, error?: string }>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<{ success: boolean, error?: string }>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean, error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add an optional authOverride parameter for testing
export const AuthProvider: React.FC<{ children: React.ReactNode, authOverride?: Partial<AuthContextType> }> = ({ children, authOverride }) => {
  console.log('AuthProvider initializing');
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser();
  const { signOut: clerkSignOut, signIn: clerkSignIn } = useClerkAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [convexSyncComplete, setConvexSyncComplete] = useState(false);

  // Create user mutation
  const createUserMutation = useMutation(api.users.createUser);
  const getUserQuery = useQuery(
    api.users.getUserByClerkId, 
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Log the current state for debugging
  useEffect(() => {
    console.log('AuthContext state:', { 
      clerkLoaded, 
      isSignedIn, 
      clerkUserId: clerkUser?.id,
      convexUserLoaded: getUserQuery !== undefined,
      convexUser: getUserQuery,
      loading,
      syncAttempted,
      convexSyncComplete
    });
  }, [clerkLoaded, isSignedIn, clerkUser, getUserQuery, loading, syncAttempted, convexSyncComplete]);

  useEffect(() => {
    // Check if user is loaded from Clerk
    if (clerkLoaded) {
      if (isSignedIn && clerkUser) {
        // If user is signed in, sync with Convex
        const syncUser = async () => {
          try {
            console.log('Syncing user with Convex...', {
              clerkId: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress,
              getUserQueryResult: getUserQuery
            });
            
            // First check if user already exists in Convex
            if (getUserQuery) {
              console.log('User found in Convex:', getUserQuery);
              setUser({
                ...clerkUser,
                convexUser: getUserQuery
              });
              setLoading(false);
              setSyncAttempted(true);
              setConvexSyncComplete(true);
              return;
            }
            
            // If not, create or get user in Convex
            console.log('Creating new user in Convex');
            const convexUserId = await createUserMutation({
              name: clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
              email: clerkUser.primaryEmailAddress?.emailAddress || '',
              role: (clerkUser.publicMetadata.role as string) || 'driver',
              clerkId: clerkUser.id,
            });
            
            console.log('User created in Convex with ID:', convexUserId);
            setUser({
              ...clerkUser,
              convexId: convexUserId,
              convexUser: { _id: convexUserId }
            });
            setSyncAttempted(true);
            setConvexSyncComplete(true);
          } catch (error) {
            console.error('Error syncing user with Convex:', error);
            // Even if there's an error, we should mark sync as attempted
            setSyncAttempted(true);
            setConvexSyncComplete(false);
          } finally {
            setLoading(false);
          }
        };
        
        syncUser();
      } else {
        console.log('User not signed in or no Clerk user');
        setUser(null);
        setLoading(false);
        setSyncAttempted(true);
        setConvexSyncComplete(false);
      }
    }
  }, [clerkLoaded, isSignedIn, clerkUser, getUserQuery]);

  // Re-query for Convex user data if we have a Clerk user but no Convex user yet
  useEffect(() => {
    if (clerkLoaded && isSignedIn && clerkUser && syncAttempted && !convexSyncComplete && !loading) {
      // If we've already attempted to sync but don't have Convex data, try again after a delay
      const retryTimer = setTimeout(() => {
        console.log('Retrying Convex user sync...');
        setSyncAttempted(false); // Reset to trigger the sync again
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [clerkLoaded, isSignedIn, clerkUser, syncAttempted, convexSyncComplete, loading]);

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      // Use Clerk's sign up process
      if (!clerkSignIn) {
        throw new Error('Clerk is not initialized');
      }
      
      const result = await clerkSignIn.create({
        strategy: 'password',
        identifier: email,
        password,
        metadata: {
          fullName,
          role,
        },
      });
      
      if (result.status !== 'complete') {
        return {
          success: true,
          requiresEmailVerification: true,
        };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign up' 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Use Clerk's sign in process
      if (!clerkSignIn) {
        throw new Error('Clerk is not initialized');
      }
      
      const result = await clerkSignIn.create({
        strategy: 'password',
        identifier: email,
        password,
      });
      
      if (result.status === 'complete') {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sign in' 
      };
    }
  };

  const signOutUser = async () => {
    try {
      if (!clerkSignOut) {
        throw new Error('Clerk is not initialized');
      }
      
      await clerkSignOut();
      setUser(null);
      setConvexSyncComplete(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Placeholder for password reset request
  const requestPasswordReset = async (email: string) => {
    try {
      // Use Clerk's password reset
      // This would be implemented with the Clerk API
      return { 
        success: true,
        message: 'Please check your email for the reset instructions.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reset email' 
      };
    }
  };

  // Placeholder for password reset
  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      // Use Clerk's password reset completion
      // This would be implemented with the Clerk API
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset password' 
      };
    }
  };

  // Placeholder for OTP verification
  const verifyOTP = async (email: string, token: string) => {
    try {
      // This would be implemented with the Clerk API
      return { success: true };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid or expired verification code' 
      };
    }
  };

  // Combine the default values with any overrides
  const value = {
    user,
    loading,
    isAuthenticated: !!user && convexSyncComplete,
    signUp,
    signIn,
    signOut: signOutUser,
    requestPasswordReset,
    resetPassword,
    verifyOTP,
    ...authOverride // Override with any provided values
  };

  console.log('AuthProvider state:', { 
    isAuthenticated: !!user && convexSyncComplete, 
    loading, 
    user: user ? 'exists' : 'null'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  // Check if we have an override from a parent component
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 