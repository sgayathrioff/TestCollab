"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceCard, CreatorCard } from "@/components/explore";
import { ReferenceCard } from "@/components/workspace/public";

type SearchTab = "workspaces" | "references" | "people";

interface WorkspaceItem {
  workspace_id: string;
  workspace_title: string;
  workspace_description: string | null;
  workspace_owner_id: string;
  workspace_visibility: string;
  profiles?: {
    profile_id: string;
    display_name: string;
    profile_avatar_url: string;
  } | null;
}

interface ReferenceItem {
  reference_id: string;
  reference_title: string;
  reference_url: string;
  reference_type: string;
  reference_metadata: {
    thumbnail?: string;
    source?: string;
    colorPalette?: string[];
  };
  folder_id?: string | null;
}

interface PersonItem {
  profile_id: string;
  display_name: string;
  profile_avatar_url: string;
}

const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
  "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800",
  "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800",
];

const defaultAvatar = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100";

export default function GlobalSearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>("workspaces");

  const [workspaceResults, setWorkspaceResults] = useState<WorkspaceItem[]>([]);
  const [referenceResults, setReferenceResults] = useState<ReferenceItem[]>([]);
  const [peopleResults, setPeopleResults] = useState<PersonItem[]>([]);

  const runSearch = async () => {
    if (!query.trim()) {
      setWorkspaceResults([]);
      setReferenceResults([]);
      setPeopleResults([]);
      return;
    }

    setLoading(true);

    try {
      const workspacePromise = supabase
        .from("workspaces")
        .select("workspace_id, workspace_title, workspace_description, workspace_owner_id, workspace_visibility")
        .eq("workspace_visibility", "public")
        .or(`workspace_title.ilike.%${query}%,workspace_description.ilike.%${query}%`)
        .limit(40);

      const peoplePromise = supabase
        .from("profiles")
        .select("profile_id, display_name, profile_avatar_url")
        .ilike("display_name", `%${query}%`)
        .limit(40);

      const referencesPromise = user
        ? Promise.all([
            supabase
              .from("workspace_members")
              .select("workspace_id")
              .eq("profile_id", user.id),
            supabase
              .from("workspaces")
              .select("workspace_id")
              .eq("workspace_owner_id", user.id),
          ]).then(async ([membershipResp, ownedResp]) => {
            const workspaceIds = Array.from(
              new Set([
                ...(membershipResp.data || []).map((m) => m.workspace_id),
                ...(ownedResp.data || []).map((w) => w.workspace_id),
              ])
            );
            if (workspaceIds.length === 0) {
              return { data: [] as ReferenceItem[] };
            }
            return supabase
              .from("references")
              .select("reference_id, reference_title, reference_url, reference_type, reference_metadata, folder_id")
              .in("workspace_id", workspaceIds)
              .ilike("reference_title", `%${query}%`)
              .limit(50);
          })
        : Promise.resolve({ data: [] as ReferenceItem[] });

      const [workspaceResp, referenceResp, peopleResp] = await Promise.all([
        workspacePromise,
        referencesPromise,
        peoplePromise,
      ]);

      const workspaces = workspaceResp.data || [];
      const people = peopleResp.data || [];
      const references = referenceResp.data || [];

      const ownerIds = Array.from(new Set(workspaces.map((w) => w.workspace_owner_id)));
      let workspacesWithProfiles = workspaces;
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("profile_id, display_name, profile_avatar_url")
          .in("profile_id", ownerIds);

        const ownerMap = new Map((owners || []).map((owner) => [owner.profile_id, owner]));
        workspacesWithProfiles = workspaces.map((workspace) => ({
          ...workspace,
          profiles: ownerMap.get(workspace.workspace_owner_id) || null,
        }));
      }

      const workspaceFuse = new Fuse(workspacesWithProfiles, {
        keys: ["workspace_title", "workspace_description"],
        threshold: 0.4,
      });

      const referenceFuse = new Fuse(references, {
        keys: ["reference_title"],
        threshold: 0.4,
      });

      const peopleFuse = new Fuse(people, {
        keys: ["display_name"],
        threshold: 0.4,
      });

      setWorkspaceResults(workspaceFuse.search(query).map((result) => result.item));
      setReferenceResults(referenceFuse.search(query).map((result) => result.item));
      setPeopleResults(peopleFuse.search(query).map((result) => result.item));
    } finally {
      setLoading(false);
    }
  };

  const tabCounts = useMemo(
    () => ({
      workspaces: workspaceResults.length,
      references: referenceResults.length,
      people: peopleResults.length,
    }),
    [workspaceResults.length, referenceResults.length, peopleResults.length]
  );

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 pb-16">
      <div className="bg-white rounded-3xl border border-stone-100 p-4 md:p-6 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
            placeholder="Search workspaces, references, and people..."
            className="w-full pl-12 pr-28 py-4 rounded-2xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-lime-400/40"
          />
          <button
            onClick={runSearch}
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-xl bg-[#1c1917] text-white text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {(["workspaces", "references", "people"] as SearchTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {tab[0].toUpperCase() + tab.slice(1)} ({tabCounts[tab]})
            </button>
          ))}
        </div>
      </div>

      {activeTab === "workspaces" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaceResults.map((workspace, index) => (
            <WorkspaceCard
              key={workspace.workspace_id}
              id={workspace.workspace_id}
              title={workspace.workspace_title || "Untitled Workspace"}
              description={workspace.workspace_description || ""}
              coverImage={placeholderImages[index % placeholderImages.length]}
              category="General"
              likes={0}
              author={
                workspace.profiles
                  ? {
                      id: workspace.profiles.profile_id,
                      name: workspace.profiles.display_name || "Unknown User",
                      avatar: workspace.profiles.profile_avatar_url || defaultAvatar,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {activeTab === "references" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {referenceResults.map((reference) => (
            <ReferenceCard
              key={reference.reference_id}
              id={reference.reference_id}
              title={reference.reference_title || "Untitled"}
              source={reference.reference_metadata?.source || reference.reference_url}
              imageUrl={reference.reference_metadata?.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"}
              tags={[]}
              type={reference.reference_type === "image" ? "image" : reference.reference_type === "video" ? "video" : "link"}
              colorPalette={reference.reference_metadata?.colorPalette}
              onOpen={() => window.open(reference.reference_url, "_blank", "noopener,noreferrer")}
            />
          ))}
          {!user && <p className="text-sm text-stone-500">Log in to search references from your member workspaces.</p>}
        </div>
      )}

      {activeTab === "people" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {peopleResults.map((person) => (
            <CreatorCard
              key={person.profile_id}
              id={person.profile_id}
              name={person.display_name || "Anonymous"}
              username={(person.display_name || "user").toLowerCase().replace(/\s+/g, "")}
              role="Creator"
              avatar={person.profile_avatar_url || defaultAvatar}
              spacesCount={0}
              followersCount={0}
            />
          ))}
        </div>
      )}

      {!loading && query.trim() && tabCounts.workspaces + tabCounts.references + tabCounts.people === 0 && (
        <div className="text-center py-12 text-stone-500">No results found for "{query}".</div>
      )}
    </div>
  );
}
