import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";

export default async function UserDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const [{ data: memberWorkspaceData }, { data: activityLogs }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("profile_id", userId)
      .limit(50),
    supabase
      .from("activity_logs")
      .select("activity_id, workspace_id, actor_profile_id, activity_type, activity_payload, activity_created_at, profiles(display_name, profile_avatar_url), workspaces!inner(workspace_id, workspace_members!inner(profile_id))")
      .eq("workspaces.workspace_members.profile_id", userId)
      .order("activity_created_at", { ascending: false })
      .limit(15),
  ]);

  const workspaces = (memberWorkspaceData || [])
    .map((row: any) => row.workspaces)
    .filter(Boolean);

  return (
    <DashboardClient
      userId={userId}
      initialWorkspaces={workspaces}
      initialActivityLogs={activityLogs || []}
    />
  );
}