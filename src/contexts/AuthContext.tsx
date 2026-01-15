
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';
import { getProfile } from '../services/supabaseService';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error retrieving session:", error);
          await supabase.auth.signOut(); // Clear invalid token
          setSession(null);
          setUser(null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            // Add timeout for profile fetch
            const profilePromise = getProfile(session.user.id);
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const profileData = await Promise.race([profilePromise, timeoutPromise]);
            setProfile(profileData as Profile);
          } catch (error) {
            console.error("Error fetching initial profile:", error);
          }
        }
      } catch (err) {
        console.error("Unexpected error during session fetch:", err);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
      }
    };

    // Failsafe: Force loading to false after 5 seconds to prevent infinite spinner
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Session fetch timed out. Forcing app load.");
          return false;
        }
        return prev;
      });
    }, 5000);

    fetchSession().then(() => clearTimeout(timer));

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only set loading for major events where user might change
        const shouldLoad = event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'PASSWORD_RECOVERY';

        if (shouldLoad && session?.user) {
          setLoading(true); // Show spinner while fetching profile
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            // Only fetch profile if strict condition met or if we don't have it yet
            // But to be safe and ensure data sync, we fetch it on sign-in
            const profilePromise = getProfile(session.user.id);
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const profileData = await Promise.race([profilePromise, timeoutPromise]);
            setProfile(profileData as Profile);
          } catch (error) {
            console.error("Error fetching profile on auth change:", error);
          } finally {
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    profile,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
