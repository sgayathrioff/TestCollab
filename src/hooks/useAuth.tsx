"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

let authInitPromise: Promise<void> | null = null;
let authSubscribed = false;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

const fetchAndStoreProfile = async (userId: string) => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("profile_id", userId)
    .single();

  if (profileError) {
    const message = getErrorMessage(profileError);
    if (!message.toLowerCase().includes("failed to fetch")) {
      console.error("Error fetching profile:", message);
    }
  }

  useAuthStore.getState().setProfile(profile || null);
};

const initializeAuthOnce = async () => {
  if (!authInitPromise) {
    authInitPromise = (async () => {
      const { setUser, setIsLoading, clear } = useAuthStore.getState();
      setIsLoading(true);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          const message = getErrorMessage(sessionError);
          if (!message.toLowerCase().includes("failed to fetch")) {
            console.error("Error fetching session:", message);
          }
          setIsLoading(false);
          return;
        }

        if (!session?.user) {
          clear();
          return;
        }

        setUser({ id: session.user.id, email: session.user.email || "" });
        await fetchAndStoreProfile(session.user.id);
      } catch (error) {
        const message = getErrorMessage(error);
        if (!message.toLowerCase().includes("failed to fetch")) {
          console.error("Error loading user:", message);
        }
      } finally {
        useAuthStore.getState().setIsLoading(false);
      }

      if (!authSubscribed) {
        authSubscribed = true;
        supabase.auth.onAuthStateChange(async (_event, session) => {
          const { setUser, setIsLoading, clear } = useAuthStore.getState();
          setIsLoading(true);

          try {
            if (session?.user) {
              setUser({ id: session.user.id, email: session.user.email || "" });
              await fetchAndStoreProfile(session.user.id);
            } else {
              clear();
            }
          } catch (error) {
            const message = getErrorMessage(error);
            if (!message.toLowerCase().includes("failed to fetch")) {
              console.error("Error fetching profile on auth change:", message);
            }
          } finally {
            useAuthStore.getState().setIsLoading(false);
          }
        });
      }
    })();
  }

  return authInitPromise;
};

export function useAuth() {
  const { user, profile, isLoading: loading, clear } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initializeAuthOnce();
  }, []);

  const signOut = async () => {
    try {
      clear();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", getErrorMessage(error));
      }
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", getErrorMessage(error));
      router.push("/login"); // Still redirect even if error
    }
  };

  return { user, profile, loading, signOut };
}