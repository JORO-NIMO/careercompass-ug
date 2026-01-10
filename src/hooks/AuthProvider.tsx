import { useEffect, useState, useRef, type ReactNode } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { AuthContext } from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

const ADMIN_ROLE = "admin";

async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", ADMIN_ROLE)
      .maybeSingle();

    return Boolean(data) && !error;
  } catch (error: unknown) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Upsert profile for signed-in users to ensure they're stored in DB
      if (nextSession?.user) {
        void (async () => {
          try {
            const u = nextSession.user;
            await supabase.from('profiles').upsert([
              {
                id: u.id,
                email: u.email ?? null,
                full_name: (u.user_metadata as any)?.full_name ?? (u.user_metadata as any)?.name ?? null,
                updated_at: new Date().toISOString(),
              },
            ], { onConflict: 'id' });
          } catch (err) {
            console.warn('Failed to upsert profile on auth change', err);
          }
        })();

        void checkAdminStatus(nextSession.user.id).then((result) => {
          setIsAdmin(result);
          setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        // upsert profile on initial load
        void (async () => {
          try {
            const u = initialSession.user;
            await supabase.from('profiles').upsert([
              {
                id: u.id,
                email: u.email ?? null,
                full_name: (u.user_metadata as any)?.full_name ?? (u.user_metadata as any)?.name ?? null,
                updated_at: new Date().toISOString(),
              },
            ], { onConflict: 'id' });
          } catch (err) {
            console.warn('Failed to upsert profile on session init', err);
          }
        })();

        void checkAdminStatus(initialSession.user.id).then((result) => {
          setIsAdmin(result);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    return { error };
  };

  const signInWithGithub = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' });
    return { error };
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: AuthError | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Auto sign-out after inactivity (3 minutes)
  const inactivityTimeoutRef = useRef<number | null>(null);
  const INACTIVITY_LIMIT = 3 * 60 * 1000; // 3 minutes

  useEffect(() => {
    // clear any existing timer
    const clearTimer = () => {
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };

    const startTimer = () => {
      clearTimer();
      inactivityTimeoutRef.current = window.setTimeout(() => {
        void supabase.auth.signOut();
      }, INACTIVITY_LIMIT);
    };

    const activityHandler = () => {
      if (session) startTimer();
    };

    // Only run when there's an active session
    if (session) {
      const events: Array<keyof WindowEventMap> = [
        "mousemove",
        "keydown",
        "mousedown",
        "touchstart",
        "scroll",
      ];

      events.forEach((ev) => window.addEventListener(ev, activityHandler));

      // start initial timer
      startTimer();

      return () => {
        events.forEach((ev) => window.removeEventListener(ev, activityHandler));
        clearTimer();
      };
    }

    // If no session, ensure timer cleared
    clearTimer();
    return undefined;
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, signOut, signInWithGoogle, signInWithGithub }}>
      {children}
    </AuthContext.Provider>
  );
}
