"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceCard, CreatorCard, ExploreSearchBar } from "@/components/explore";

type FilterType = "all" | "workspaces" | "creators";

interface WorkspaceResult {
  workspace_id: string;
  workspace_title: string;
  workspace_description: string;
  workspace_owner_id: string;
  workspace_visibility: string;
  matchedBy?: 'title' | 'tags' | 'both';
  matchedTags?: string[];
  profiles?: {
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
  } | {
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
  }[] | null;
}

interface CreatorResult {
  profile_id: string;
  display_name: string;
  profile_avatar_url: string;
  workspaces_count: number;
  followers_count: number;
}

interface TrendingWorkspace {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  categoryEmoji: string;
  likes: number;
  isLiked: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface FeaturedCreator {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string;
  spacesCount: number;
  followersCount: number;
  isFollowing: boolean;
}

interface ExploreClientProps {
  initialPublicWorkspaces: Array<{
    workspace_id: string;
    workspace_title: string;
    workspace_description: string;
    workspace_visibility: string;
    workspace_created_at: string;
    workspace_owner_id?: string;
  }>;
  initialProfiles: Array<{
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
    profile_skills?: string[];
  }>;
}

const getCategoryEmoji = (category: string | null) => {
  const emojiMap: Record<string, string> = {
    Design: "🎨",
    Code: "💻",
    Audio: "🎧",
    Branding: "✨",
    Mobile: "📱",
    Video: "🎬",
    Writing: "📝",
    Research: "🔬",
    Marketing: "📈",
  };
  return emojiMap[category || ""] || "📁";
};

const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
  "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800",
  "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800",
];

const defaultAvatar = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100";

export default function ExploreClient({ initialPublicWorkspaces, initialProfiles }: ExploreClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchLoading, setSearchLoading] = useState(false);
  const [initialLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    workspaces: WorkspaceResult[];
    creators: CreatorResult[];
  }>({ workspaces: [], creators: [] });
  const [hasSearched, setHasSearched] = useState(false);

  const [trendingWorkspaces] = useState<TrendingWorkspace[]>(
    (initialPublicWorkspaces || []).slice(0, 6).map((ws, index) => ({
      id: ws.workspace_id,
      title: ws.workspace_title || "Untitled Workspace",
      description: ws.workspace_description || "No description available",
      coverImage: placeholderImages[index % placeholderImages.length],
      category: "General",
      categoryEmoji: getCategoryEmoji("General"),
      likes: 0,
      isLiked: false,
      author: {
        id: ws.workspace_owner_id || "",
        name: "Unknown User",
        avatar: defaultAvatar,
      },
    }))
  );

  const [featuredCreators] = useState<FeaturedCreator[]>(
    (initialProfiles || []).slice(0, 8).map((profile) => ({
      id: profile.profile_id,
      name: profile.display_name || "Anonymous User",
      username: profile.display_name?.toLowerCase().replace(/\s+/g, '') || profile.profile_id.slice(0, 8),
      role: "Creator",
      avatar: profile.profile_avatar_url || defaultAvatar,
      spacesCount: 0,
      followersCount: 0,
      isFollowing: false,
    }))
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setHasSearched(false);
      setSearchResults({ workspaces: [], creators: [] });
      return;
    }

    setSearchLoading(true);
    setHasSearched(true);

    try {
      const [
        { data: workspacesByTitle, error: titleError },
        { data: workspacesByTags, error: tagsError },
        { data: creators, error: creatorError },
      ] = await Promise.all([
        supabase
          .from("workspaces")
          .select(`
            workspace_id,
            workspace_title,
            workspace_description,
            workspace_owner_id,
            workspace_visibility
          `)
          .ilike("workspace_title", `%${searchQuery}%`)
          .eq("workspace_visibility", "public")
          .limit(12),
        supabase
          .from("workspaces")
          .select(`
            workspace_id,
            workspace_title,
            workspace_description,
            workspace_owner_id,
            workspace_visibility,
            references!inner(
              reference_id,
              reference_tags!inner(
                tags!inner(
                  tag_name
                )
              )
            )
          `)
          .ilike("references.reference_tags.tags.tag_name", `%${searchQuery}%`)
          .eq("workspace_visibility", "public")
          .limit(12),
        supabase
          .from("profiles")
          .select("profile_id, display_name, profile_avatar_url")
          .ilike("display_name", `%${searchQuery}%`)
          .limit(12),
      ]);

      if (titleError) throw titleError;

      const workspaceMap = new Map();

      (workspacesByTitle || []).forEach(ws => {
        workspaceMap.set(ws.workspace_id, {
          workspace_id: ws.workspace_id,
          workspace_title: ws.workspace_title,
          workspace_description: ws.workspace_description,
          workspace_owner_id: ws.workspace_owner_id,
          workspace_visibility: ws.workspace_visibility,
          matchedBy: 'title' as const,
          matchedTags: []
        });
      });

      if (!tagsError && workspacesByTags) {
        workspacesByTags.forEach((ws: any) => {
          const matchedTags = ws.references?.flatMap((ref: any) =>
            ref.reference_tags?.flatMap((rt: any) =>
              rt.tags?.tag_name || []
            ) || []
          ).filter((tag: string) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ) || [];

          const existing = workspaceMap.get(ws.workspace_id);
          if (existing) {
            existing.matchedBy = 'both';
            existing.matchedTags = [...new Set([...existing.matchedTags, ...matchedTags])];
          } else {
            workspaceMap.set(ws.workspace_id, {
              workspace_id: ws.workspace_id,
              workspace_title: ws.workspace_title,
              workspace_description: ws.workspace_description,
              workspace_owner_id: ws.workspace_owner_id,
              workspace_visibility: ws.workspace_visibility,
              matchedBy: 'tags' as const,
              matchedTags: [...new Set(matchedTags)]
            });
          }
        });
      }

      const workspaces = Array.from(workspaceMap.values());

      let workspacesWithProfiles = workspaces || [];
      if (workspaces && workspaces.length > 0) {
        const ownerIds = [...new Set(workspaces.map((ws: any) => ws.workspace_owner_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("profile_id, display_name, profile_avatar_url")
          .in("profile_id", ownerIds);

        const profileMap = new Map(
          profilesData?.map(p => [p.profile_id, p]) || []
        );

        workspacesWithProfiles = workspaces.map((ws: any) => ({
          ...ws,
          profiles: profileMap.get(ws.workspace_owner_id) || null,
        }));
      }

      if (creatorError) throw creatorError;

      setSearchResults({
        workspaces: workspacesWithProfiles as WorkspaceResult[],
        creators: creators?.map((c: any) => ({
          profile_id: c.profile_id,
          display_name: c.display_name,
          profile_avatar_url: c.profile_avatar_url,
          workspaces_count: 0,
          followers_count: 0,
        })) || [],
      });
    } catch (err) {
      console.error("Error fetching search results:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAuthorClick = (authorId: string) => {
    router.push(`/profile/${authorId}`);
  };

  const getWorkspaceProfile = (workspace: WorkspaceResult) => {
    if (!workspace.profiles) return undefined;
    const profile = Array.isArray(workspace.profiles)
      ? workspace.profiles[0]
      : workspace.profiles;
    return profile;
  };

  const showWorkspaces = activeFilter === "all" || activeFilter === "workspaces";
  const showCreators = activeFilter === "all" || activeFilter === "creators";

  return (
    <div className="pb-20">
      <ExploreSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isLoading={searchLoading}
      />

      {hasSearched && (
        <div className="mb-20">
          {showWorkspaces && searchResults.workspaces.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-stone-900 mb-6">
                Workspaces ({searchResults.workspaces.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.workspaces.map((workspace, index) => {
                  const profile = getWorkspaceProfile(workspace);
                  return (
                    <div key={workspace.workspace_id} className="relative">
                      <WorkspaceCard
                        id={workspace.workspace_id}
                        title={workspace.workspace_title || "Untitled Workspace"}
                        description={workspace.workspace_description || ""}
                        coverImage={placeholderImages[index % placeholderImages.length]}
                        category="General"
                        likes={0}
                        author={
                          profile
                            ? {
                                id: profile.profile_id,
                                name: profile.display_name,
                                avatar:
                                  profile.profile_avatar_url ||
                                  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100",
                              }
                            : undefined
                        }
                        onAuthorClick={() =>
                          profile && handleAuthorClick(profile.profile_id)
                        }
                      />
                      {workspace.matchedBy === 'tags' && (
                        <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                          Found by tags
                        </div>
                      )}
                      {workspace.matchedBy === 'both' && (
                        <div className="absolute top-4 left-4 bg-lime-100 text-lime-700 px-2 py-1 rounded-full text-xs font-medium">
                          Name + tags match
                        </div>
                      )}
                      {workspace.matchedTags && workspace.matchedTags.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex flex-wrap gap-1">
                            {workspace.matchedTags.slice(0, 3).map((tag, tagIndex) => (
                              <span key={tagIndex} className="bg-white/90 text-stone-600 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
                                {tag}
                              </span>
                            ))}
                            {workspace.matchedTags.length > 3 && (
                              <span className="bg-white/90 text-stone-400 px-2 py-0.5 rounded-full text-xs">
                                +{workspace.matchedTags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showCreators && searchResults.creators.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-6">
                Creators ({searchResults.creators.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {searchResults.creators.map((creator) => (
                  <CreatorCard
                    key={creator.profile_id}
                    id={creator.profile_id}
                    name={creator.display_name || "Anonymous"}
                    username={creator.display_name?.toLowerCase().replace(/\s+/g, '') || "user"}
                    role="Creator"
                    avatar={
                      creator.profile_avatar_url ||
                      "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200"
                    }
                    spacesCount={creator.workspaces_count}
                    followersCount={creator.followers_count}
                  />
                ))}
              </div>
            </div>
          )}

          {searchResults.workspaces.length === 0 &&
            searchResults.creators.length === 0 && (
              <div className="text-center py-12">
                <p className="text-stone-500 text-lg">
                  No results found for &quot;{searchQuery}&quot;
                </p>
              </div>
            )}
        </div>
      )}

      {!hasSearched && showWorkspaces && (
        <div className="mb-20 float-in delay-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-lime-600" /> Trending Workspaces
            </h2>
            <button className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest">
              View All
            </button>
          </div>

          {initialLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-3 pb-5 rounded-[40px] border border-stone-100 animate-pulse">
                  <div className="aspect-[16/10] rounded-[32px] bg-stone-200 mb-4"></div>
                  <div className="px-4">
                    <div className="h-6 bg-stone-200 rounded mb-2 w-3/4"></div>
                    <div className="h-4 bg-stone-200 rounded mb-4 w-1/2"></div>
                    <div className="flex items-center gap-2 pt-4 border-t border-stone-100">
                      <div className="w-8 h-8 rounded-full bg-stone-200"></div>
                      <div className="h-4 bg-stone-200 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : trendingWorkspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  {...workspace}
                  onAuthorClick={() => handleAuthorClick(workspace.author.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-[40px] border border-stone-100">
              <p className="text-stone-500 text-lg">No public workspaces yet. Be the first to share!</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && showCreators && (
        <div className="float-in delay-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" /> Featured Creators
            </h2>
            <button className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest">
              View All
            </button>
          </div>

          {initialLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white p-6 rounded-[40px] border border-stone-100 animate-pulse flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-stone-200 mb-4"></div>
                  <div className="h-5 bg-stone-200 rounded w-24 mb-2"></div>
                  <div className="h-4 bg-stone-200 rounded w-32 mb-4"></div>
                  <div className="flex gap-4 mb-6">
                    <div className="h-4 bg-stone-200 rounded w-16"></div>
                    <div className="h-4 bg-stone-200 rounded w-16"></div>
                  </div>
                  <div className="w-full h-12 bg-stone-200 rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : featuredCreators.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredCreators.map((creator) => (
                <CreatorCard key={creator.id} {...creator} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-[40px] border border-stone-100">
              <p className="text-stone-500 text-lg">No creators found. Sign up and become one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
