import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ success: boolean, error?: string, message?: string }>;
  verifyOTP: (email: string, token: string) => Promise<{ success: boolean, error?: string }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean, error?: string }>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<{ success: boolean, error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      // First, check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return { success: false, error: 'An account with this email already exists' };
      }

      // Create user with admin API to bypass email verification
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role,
        }
      });

      if (createError) throw createError;
      if (!userData?.user) throw new Error('Failed to create user account');

      // Wait for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the profile was created
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        // If profile doesn't exist, create it manually
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userData.user.id,
            full_name: fullName,
            email: email,
            role: role,
            status: 'active',
          });

        if (insertError) {
          // If profile creation fails, delete the user and throw error
          await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
          throw new Error('Failed to create profile');
        }
      }

      return { 
        success: true,
        message: 'Account created successfully. You can now log in.'
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred during signup' 
      };
    }
  };

  const verifyOTP = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('OTP verification error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid or expired verification code' 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'waste-route://reset-password'
      });

      if (error) throw error;

      return { 
        success: true,
        message: 'Please check your email for the password reset code.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reset email' 
      };
    }
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      // First verify the OTP
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });

      if (verifyError) throw verifyError;

      // If OTP is valid, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset password' 
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    verifyOTP,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
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