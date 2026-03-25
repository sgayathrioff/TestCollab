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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const [{ data: memberRows }, { data: ownedWorkspaces }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("profile_id", userId)
      .limit(50),
    supabase
      .from("workspaces")
      .select("*")
      .eq("workspace_owner_id", userId)
      .order("workspace_created_at", { ascending: false })
      .limit(50),
  ]);

  const memberWorkspaces = (memberRows || [])
    .map((row: any) => row.workspaces)
    .filter(Boolean)
    .flat();

  const allWorkspaces = [...(ownedWorkspaces || []), ...(memberWorkspaces || [])];
  const uniqueWorkspaces = Array.from(
    new Map(allWorkspaces.map((w: any) => [w.workspace_id, w])).values()
  );

  const workspaceIds = uniqueWorkspaces.map((w: any) => w.workspace_id);

  const { data: activityLogs } = workspaceIds.length
    ? await supabase
        .from("activity_logs")
        .select("*, profiles(display_name, profile_avatar_url)")
        .in("workspace_id", workspaceIds)
        .order("activity_created_at", { ascending: false })
        .limit(15)
    : { data: [] as any[] };

  return (
    <DashboardClient
      initialWorkspaces={uniqueWorkspaces}
      initialActivityLogs={activityLogs || []}
      userId={userId}
    />
  );
}