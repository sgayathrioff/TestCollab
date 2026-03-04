"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowDownUp, LayoutGrid, List, Plus, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  ReferenceCard,
  WorkspaceHeader,
  WorkspaceSidebar,
} from "@/components/workspace/public";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { AddReferenceModal } from "@/components/workspace/AddReferenceModal";
import { ManageMembersModal } from "@/components/workspace/ManageMembersModal";
import { WorkspaceChat } from "@/components/workspace/chat";
import type { ReferenceData, WorkspaceMember } from "@/types";

interface Collection {
  id: string;
  name: string;
  count: number;
}

function PublicWorkspaceContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Use the useWorkspace hook for data management - only when workspaceId is available
  const workspaceHookResult = useWorkspace(workspaceId || "skip");
  
  // Destructure with safe defaults when workspaceId is null
  const {
    workspace = null,
    owner = null,  
    references = [],
    members = [],
    loading = !workspaceId ? false : true,
    isOwner = false,
    getCurrentUserRole,
    getPermissions,
    deleteReference,
    removeMember,
    inviteMemberByEmail,
  } = workspaceId ? workspaceHookResult : {};

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Collections and tags derived from references
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Get current user permissions (only when we have the functions)
  const permissions = getPermissions ? getPermissions() : {
    canView: false,
    canEdit: false,
    canManageMembers: false,
    canDeleteWorkspace: false,
  };

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setWorkspaceId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Extract collections and tags from references when they change
  useEffect(() => {
    if (!references.length) {
      setCollections([]);
      setTags([]);
      return;
    }

    // Extract unique categories for collections
    const categoryMap = new Map<string, number>();
    references.forEach((ref: ReferenceData) => {
      const category = ref.reference_category || "Uncategorized";
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const extractedCollections: Collection[] = Array.from(
      categoryMap.entries()
    ).map(([name, count], index) => ({
      id: String(index + 1),
      name,
      count,
    }));
    setCollections(extractedCollections);

    // Extract unique tags
    const tagSet = new Set<string>();
    references.forEach((ref: ReferenceData) => {
      (ref.reference_tags || []).forEach((tag: string) => tagSet.add(tag));
    });
    setTags(Array.from(tagSet).slice(0, 8));
  }, [references]);

  // Filter references with proper typing
  const filteredReferences = references.filter((ref: ReferenceData) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      ref.reference_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.reference_tags?.some((tag: string) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Collection filter
    const matchesCollection =
      activeCollection === null ||
      ref.reference_category ===
        collections.find((c) => c.id === activeCollection)?.name;

    return matchesSearch && matchesCollection;
  });

  // Handlers
  const handleLike = useCallback(async () => {
    if (!workspace) return;
    showToast("Added to your Favorites 💖");
  }, [workspace, showToast]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to clipboard! 📋");
  }, [showToast]);

  const handleDuplicate = useCallback(async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    showToast("Duplicated to your Dashboard ✨");
  }, [user, router, showToast]);

  const handleSaveReference = useCallback(
    (refId: string) => {
      showToast("Item Saved to your Library");
    },
    [showToast]
  );

  const handleOpenReference = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag);
  }, []);

  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      Design: "🎨",
      Code: "💻",
      Audio: "🎧",
      Branding: "✨",
      Mobile: "📱",
      Video: "🎬",
      Writing: "📝",
    };
    return emojiMap[category] || "📁";
  };

  if (loading || authLoading || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-stone-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-stone-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Owner-only: Add Reference Modal */}
      {permissions.canEdit && workspace && (
        <AddReferenceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          workspaceId={workspace.workspace_id}
        />
      )}

      {/* Manage Members Modal */}
      {permissions.canManageMembers && workspace && (
        <ManageMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          members={members}
          currentUserId={user?.id}
          ownerId={workspace.workspace_owner_id}
          canManageMembers={permissions.canManageMembers}
          onInviteMember={inviteMemberByEmail!}
          onRemoveMember={removeMember!}
        />
      )}

      {/* Header */}
      <WorkspaceHeader
        id={workspace?.workspace_id || ""}
        title={workspace?.workspace_title || ""}
        description={workspace?.workspace_description || ""}
        coverImage="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600"
        category="General"
        categoryEmoji={getCategoryEmoji("General")}
        views={0}
        likes={0}
        author={{
          id: owner?.profile_id || "",
          name: owner?.display_name || "Unknown User",
          avatar: owner?.profile_avatar_url || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100",
        }}
        onLike={handleLike}
        onShare={handleShare}
        onDuplicate={handleDuplicate}
        isOwner={!!isOwner}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 float-in delay-2">
        {/* Sidebar */}
        <WorkspaceSidebar
          collections={collections}
          tags={tags}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
          onTagClick={handleTagClick}
        />

        {/* References Grid */}
        <main>
          {/* Search and Filter Bar */}
          <div className="flex items-center justify-between mb-6 bg-white p-2 pr-6 rounded-full shadow-sm border border-stone-100">
            <div className="relative group w-full max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search inside this space..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:outline-none text-stone-900 placeholder:text-stone-400 font-medium text-sm"
              />
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <button className="text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1">
                <ArrowDownUp className="w-4 h-4" /> Sort
              </button>
              <div className="w-px h-6 bg-stone-200 mx-1"></div>
              <button
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "text-stone-900" : "text-stone-400 hover:text-stone-900"}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "text-stone-900" : "text-stone-400 hover:text-stone-900"}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* References Grid */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "flex flex-col gap-4"
            }
          >
            {filteredReferences.map((ref: ReferenceData) => (
              <ReferenceCard
                key={ref.reference_id}
                id={ref.reference_id}
                title={ref.reference_title || "Untitled"}
                source={ref.reference_source || ref.reference_url || ""}
                imageUrl={
                  ref.reference_thumbnail ||
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"
                }
                tags={ref.reference_tags || []}
                type={ref.reference_type as "image" | "link" | "color" | "video"}
                colorPalette={
                  ref.reference_type === "color"
                    ? ["#2C3E50", "#E74C3C", "#ECF0F1", "#3498DB"]
                    : undefined
                }
                onSave={() => handleSaveReference(ref.reference_id)}
                onOpen={() => handleOpenReference(ref.reference_url)}
                onDelete={() => deleteReference?.(ref.reference_id)}
                canDelete={permissions.canEdit}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredReferences.length === 0 && (
            <div className="text-center py-16">
              <p className="text-stone-500 text-lg">
                {searchQuery
                  ? `No references found for "${searchQuery}"`
                  : "No references in this collection yet."}
              </p>
              {permissions.canEdit && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 px-6 py-3 bg-[#1c1917] text-white rounded-full font-medium hover:bg-stone-800 transition-colors"
                >
                  Add your first reference
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Owner-only: Floating Add Button */}
      {permissions.canEdit && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-linear-to-tr from-lime-400 to-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-lime-500/40 hover:scale-110 hover:rotate-90 transition-all duration-500 z-30"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Manage Members Button - Only for owners */}
      {permissions.canManageMembers && (
        <button
          onClick={() => setIsMembersModalOpen(true)}
          className={`fixed bottom-8 ${permissions.canEdit ? 'right-28' : 'right-8'} w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all duration-300 z-30`}
          title="Manage Members"
        >
          <Users className="w-6 h-6" />
        </button>
      )}

      {/* Chat Button - Only for workspace members */}
      {members.some((m: WorkspaceMember) => m.profile_id === user?.id) && (
        <button
          onClick={() => setIsChatOpen(true)}
          className={`fixed bottom-8 ${
            permissions.canManageMembers && permissions.canEdit ? 'right-44' : 
            permissions.canManageMembers || permissions.canEdit ? 'right-28' : 
            'right-8'
          } w-14 h-14 bg-[#1c1917] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all duration-300 z-30`}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel - Only for workspace members */}
      {members.some((m: WorkspaceMember) => m.profile_id === user?.id) && workspaceId && (
        <WorkspaceChat
          workspaceId={workspaceId}
          currentUserId={user?.id}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}

export default function PublicWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ToastProvider>
      <PublicWorkspaceContent params={params} />
    </ToastProvider>
  );
}
