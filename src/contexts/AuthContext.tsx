import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithPin: (pin: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithPin = async (pin: string, password: string) => {
    try {
      // Find user by PIN - using text comparison to ensure proper matching
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('pin', pin.toString().trim());

      if (profileError) {
        console.error('Profile query error:', profileError);
        return { error: { message: 'Invalid PIN' } };
      }

      if (!profiles || profiles.length === 0) {
        console.log('No profile found for PIN:', pin);
        return { error: { message: 'Invalid PIN' } };
      }

      const profile = profiles[0];

      // Get user data from auth.users table using a direct query
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', profile.user_id)
        .single();
      
      if (userError) {
        console.error('User query error:', userError);
        // If direct query fails, try using RPC or alternative approach
        return { error: { message: 'User not found' } };
      }

      if (!userData?.email) {
        return { error: { message: 'User email not found' } };
      }

      return signIn(userData.email, password);
    } catch (error) {
      console.error('SignInWithPin error:', error);
      return { error: { message: 'Login failed. Please try again.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithPin,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};