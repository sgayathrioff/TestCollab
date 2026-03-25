"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

export function useAuth() {
  const { user, setUser, setProfile, isLoading: loading, setIsLoading, clear } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        // A. Get the Basic Auth User
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Error fetching session:", sessionError);
          setIsLoading(false);
          return;
        }

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        // B. If logged in, fetch the Extra Details from 'profiles' table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('profile_id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        setUser({ id: session.user.id, email: session.user.email || "" });
        setProfile(profile || null);

        // Note: Don't redirect here - let the auth callback or individual pages handle redirects
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // D. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Re-fetch profile on login to be safe
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('profile_id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile on auth change:", profileError);
        }

        setUser({ id: session.user.id, email: session.user.email || "" });
        setProfile(profile || null);
      } else {
        clear();
        // Only redirect automatically on session timeout, not on manual signOut
        // (signOut function handles its own redirect)
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router, clear, setIsLoading, setProfile, setUser]);

  const signOut = async () => {
    try {
      clear();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      router.push("/login"); // Still redirect even if error
    }
  };

  return { user, loading, signOut };
}