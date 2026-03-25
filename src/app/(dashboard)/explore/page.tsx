import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ExploreClient from "./ExploreClient";

export default async function ExplorePage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const [{ data: publicWorkspaces }, { data: profiles }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("workspace_id, workspace_title, workspace_description, workspace_visibility, workspace_created_at, workspace_owner_id")
      .eq("workspace_visibility", "public")
      .eq("is_archived", false)
      .limit(24),
    supabase
      .from("profiles")
      .select("profile_id, display_name, profile_avatar_url, profile_skills")
      .limit(20),
  ]);

  return <ExploreClient initialWorkspaces={publicWorkspaces || []} initialProfiles={profiles || []} />;
}