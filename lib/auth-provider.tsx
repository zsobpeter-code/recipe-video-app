import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User as SupabaseUser, AuthError } from "@supabase/supabase-js";
import { supabase, User } from "./supabase";

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from our users table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === "PGRST116") {
          return null;
        }
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as User;
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      return null;
    }
  }, []);

  // Create user profile if it doesn't exist
  const createProfile = useCallback(async (userId: string, email: string | undefined, displayName?: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: email || null,
          display_name: displayName || null,
          subscription_tier: "free",
          video_credits: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating profile:", error);
        return null;
      }
      return data as User;
    } catch (err) {
      console.error("Error in createProfile:", err);
      return null;
    }
  }, []);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        let profileData = await fetchProfile(session.user.id);
        if (!profileData) {
          profileData = await createProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.display_name
          );
        }
        setProfile(profileData);
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        let profileData = await fetchProfile(session.user.id);
        if (!profileData && event === "SIGNED_IN") {
          profileData = await createProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.display_name
          );
        }
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, createProfile]);

  // Sign in with email and password
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Sign up with email and password
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    // If signup successful and we have a user, create their profile
    if (!error && data.user) {
      await createProfile(data.user.id, email, displayName);
    }

    return { error };
  };

  // Sign in with Apple
  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        skipBrowserRedirect: true,
      },
    });
    return { error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
