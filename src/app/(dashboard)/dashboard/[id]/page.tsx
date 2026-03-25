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

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const effectiveUserId = authUser?.id || userId;

  const [{ data: memberRows }, { data: ownedWorkspaces }] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(*)")
      .eq("profile_id", effectiveUserId)
      .limit(200),
    supabase
      .from("workspaces")
      .select("*")
      .eq("workspace_owner_id", effectiveUserId)
      .order("workspace_created_at", { ascending: false })
      .limit(200),
  ]);

  const ownedWorkspaceIds = new Set((ownedWorkspaces || []).map((w: any) => w.workspace_id));

  const joinedSharedWorkspaces = (memberRows || [])
    .map((row: any) => row.workspaces)
    .filter(Boolean)
    .flat();

  const joinedSharedIds = new Set(
    joinedSharedWorkspaces.map((w: any) => w.workspace_id).filter(Boolean)
  );

  const fallbackSharedIds = Array.from(
    new Set(
      (memberRows || [])
        .map((row: any) => row.workspace_id)
        .filter(
          (id: string) =>
            !!id && !ownedWorkspaceIds.has(id) && !joinedSharedIds.has(id)
        )
    )
  );

  const { data: fallbackSharedWorkspaces } = fallbackSharedIds.length
    ? await supabase
        .from("workspaces")
        .select("*")
        .in("workspace_id", fallbackSharedIds)
        .order("workspace_created_at", { ascending: false })
    : { data: [] as any[] };

  const allWorkspaces = [
    ...(ownedWorkspaces || []),
    ...joinedSharedWorkspaces,
    ...(fallbackSharedWorkspaces || []),
  ];
  const uniqueWorkspaces = Array.from(
    new Map(allWorkspaces.map((w: any) => [w.workspace_id, w])).values()
  );
  const activeWorkspaces = uniqueWorkspaces.filter((workspace: any) => !workspace.is_archived);

  const workspaceIds = activeWorkspaces.map((w: any) => w.workspace_id);

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
      initialWorkspaces={activeWorkspaces}
      initialActivityLogs={activityLogs || []}
      userId={effectiveUserId}
    />
  );
}