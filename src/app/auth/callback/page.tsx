"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Get the code from URL query params (Supabase uses PKCE flow)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      // Check for OAuth errors
      if (error) {
        console.error("OAuth error:", error, errorDescription);
        router.push(`/login?error=${error}`);
        return;
      }

      // If there's a code, exchange it for a session
      if (code) {
        try {
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

          if (sessionError) {
            console.error("Error exchanging code for session:", sessionError.message);
            router.push("/login?error=session_error");
            return;
          }

          if (data?.user) {
            router.push(`/dashboard/${data.user.id}`);
          } else {
            console.error("No user found after exchanging code.");
            router.push("/login?error=user_not_found");
          }
        } catch (err) {
          console.error("Error handling auth callback:", err);
          router.push("/login?error=callback_error");
        }
      } else {
        // Fallback: Check if there's already a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.push(`/dashboard/${session.user.id}`);
        } else {
          console.error("No code or session found.");
          router.push("/login?error=no_code");
        }
      }
    };

    handleAuthCallback();
  }, [router]);

  return <div>Loading...</div>;
}