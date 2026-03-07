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
import { EditReferenceModal } from "@/components/workspace/EditReferenceModal";
import { ManageMembersModal } from "@/components/workspace/ManageMembersModal";
import { TagManager } from "@/components/workspace/TagManager";
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
    deleteWorkspace,
    updateReference,
    refetch,
  } = workspaceId ? workspaceHookResult : {};

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<ReferenceData | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

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

    // For now, just show all references in one collection
    // TODO: Implement proper category/folder feature when DB column is added
    setCollections([
      { id: "1", name: "All References", count: references.length }
    ]);

    // Extract unique tags from references
    const tagSet = new Set<string>();
    references.forEach((ref: ReferenceData) => {
      (ref.tags || []).forEach((tag) => tagSet.add(tag.tag_name));
    });
    setTags(Array.from(tagSet).slice(0, 8));
  }, [references]);

  // Filter references with proper typing
  const filteredReferences = references.filter((ref: ReferenceData) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      ref.reference_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.tags?.some((tag) =>
        tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Collection filter disabled until category feature is implemented
    // const matchesCollection = activeCollection === null;

    return matchesSearch;
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
          onReferenceAdded={() => {
            if (refetch) refetch();
          }}
        />
      )}

      {/* Edit Reference Modal */}
      {permissions.canEdit && workspace && editingReference && updateReference && (
        <EditReferenceModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingReference(null);
          }}
          workspaceId={workspace.workspace_id}
          reference={editingReference}
          onUpdate={updateReference}
          onUpdated={() => {
            if (refetch) refetch();
          }}
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

      {/* Tag Manager Modal */}
      {workspace && (
        <TagManager
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          workspaceId={workspace.workspace_id}
          onTagsUpdated={() => {
            if (refetch) refetch();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteConfirmOpen && workspace && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)} />
          <div className="relative z-10 bg-white rounded-4xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-5 mx-auto">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 text-center mb-2">Delete Workspace</h2>
            <p className="text-stone-500 text-center text-sm mb-1">
              Are you sure you want to delete <span className="font-bold text-stone-900">"{workspace.workspace_title}"</span>?
            </p>
            <p className="text-red-500 text-center text-xs mb-8">This will permanently delete all references, messages, and member data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  if (!deleteWorkspace) return;
                  setIsDeleting(true);
                  try {
                    await deleteWorkspace();
                    showToast('Workspace deleted successfully');
                    router.push(user?.id ? `/dashboard/${user.id}` : '/dashboard');
                  } catch (err: any) {
                    showToast(err.message || 'Failed to delete workspace');
                    setIsDeleting(false);
                    setIsDeleteConfirmOpen(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Deleting...</>
                ) : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
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
        onDelete={permissions.canDeleteWorkspace ? () => setIsDeleteConfirmOpen(true) : undefined}
        onManageTags={isOwner ? () => setIsTagManagerOpen(true) : undefined}
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
                source={ref.reference_metadata?.source || ref.reference_url || ""}
                imageUrl={
                  ref.reference_metadata?.thumbnail ||
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"
                }
                tags={ref.tags?.map(t => t.tag_name) || []}
                type={ref.reference_type as "image" | "link" | "color" | "video"}
                colorPalette={ref.reference_metadata?.colorPalette}
                onSave={() => handleSaveReference(ref.reference_id)}
                onOpen={() => handleOpenReference(ref.reference_url)}
                onEdit={() => {
                  setEditingReference(ref);
                  setIsEditModalOpen(true);
                }}
                onDelete={() => deleteReference?.(ref.reference_id)}
                canEdit={permissions.canEdit}
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
