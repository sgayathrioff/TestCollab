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
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: publicWorkspaces }, { data: profiles }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("workspace_id, workspace_title, workspace_description, workspace_visibility, workspace_created_at, workspace_owner_id")
      .eq("workspace_visibility", "public")
      .eq("is_archived", false)
      .limit(10),
    supabase
      .from("profiles")
      .select("profile_id, display_name, profile_avatar_url, profile_skills")
      .limit(10),
  ]);

  if (!profiles || profiles.length === 0) {
    return <ExploreClient initialWorkspaces={publicWorkspaces || []} initialProfiles={[]} />;
  }

  const profileIds = profiles.map(p => p.profile_id);

  // Fetch counts and follow status in bulk
  const [
    { data: followersData },
    { data: workspacesData },
    { data: userFollowingsData }
  ] = await Promise.all([
    supabase.from("followers").select("following_id").in("following_id", profileIds),
    supabase.from("workspaces").select("workspace_owner_id").in("workspace_owner_id", profileIds),
    user ? supabase.from("followers").select("following_id").eq("follower_id", user.id).in("following_id", profileIds) : Promise.resolve({ data: [] })
  ]);

  // Map counts
  const followerCounts = (followersData || []).reduce((acc: any, curr: any) => {
    acc[curr.following_id] = (acc[curr.following_id] || 0) + 1;
    return acc;
  }, {});

  const workspaceCounts = (workspacesData || []).reduce((acc: any, curr: any) => {
    acc[curr.workspace_owner_id] = (acc[curr.workspace_owner_id] || 0) + 1;
    return acc;
  }, {});

  const userFollowingSet = new Set((userFollowingsData || []).map((f: any) => f.following_id));

  // Transform profiles
  const transformedProfiles = profiles.map(p => ({
    ...p,
    followers_count: followerCounts[p.profile_id] || 0,
    workspaces_count: workspaceCounts[p.profile_id] || 0,
    is_following: userFollowingSet.has(p.profile_id)
  }));

  return <ExploreClient initialWorkspaces={publicWorkspaces || []} initialProfiles={transformedProfiles} />;
}