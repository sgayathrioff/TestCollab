import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/Toast";
import WorkspaceClient from "./WorkspaceClient";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    expires?: Date;
  };
};

export default async function PublicWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [workspaceResp, referencesResp, membersResp, foldersResp] = await Promise.all([
    supabase
      .from("workspaces")
      .select("workspace_id, workspace_title, workspace_description, workspace_visibility, workspace_owner_id, workspace_cover_image, is_archived, workspace_created_at")
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("references")
      .select("reference_id, workspace_id, uploaded_by_profile_id, reference_title, reference_type, reference_url, reference_status, reference_metadata, reference_created_at, folder_id")
      .eq("workspace_id", workspaceId)
      .order("reference_created_at", { ascending: false })
      .limit(50),
    supabase
      .from("workspace_members")
      .select("profile_id, member_role, profiles(display_name, profile_avatar_url, profile_email)")
      .eq("workspace_id", workspaceId)
      .limit(50),
    supabase
      .from("workspace_folders")
      .select("folder_id, folder_name, workspace_id, folder_created_at")
      .eq("workspace_id", workspaceId)
      .limit(50),
  ]);

  const initialWorkspace = workspaceResp.data || null;
  const initialReferences = referencesResp.data || [];
  const initialMembers = membersResp.data || [];
  const initialFolders = foldersResp.data || [];

  const initialUserRole: "owner" | "editor" | "viewer" | null = (() => {
    if (!user || !initialWorkspace) return null;
    if (initialWorkspace.workspace_owner_id === user.id) return "owner";
    const member = initialMembers.find((m: any) => m.profile_id === user.id);
    if (!member) return null;
    if (member.member_role === "owner") return "owner";
    if (member.member_role === "editor") return "editor";
    return "viewer";
  })();

  return (
    <ToastProvider>
      <WorkspaceClient
        workspaceId={workspaceId}
        initialWorkspace={initialWorkspace}
        initialReferences={initialReferences as any}
        initialMembers={initialMembers as any}
        initialFolders={initialFolders as any}
        initialUserRole={initialUserRole}
      />
    </ToastProvider>
  );
}
