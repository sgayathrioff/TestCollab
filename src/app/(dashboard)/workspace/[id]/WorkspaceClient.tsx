"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowDownUp, LayoutGrid, List, Plus, MessageCircle, Users, Image, PlayCircle, FileText, Mic, Link2, ChevronDown, ChevronRight, FolderInput, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFollow } from "@/hooks/useFollow";
import { useWorkspaceStore } from "@/lib/stores/workspaceStore";
import { useReferencesStore } from "@/lib/stores/referencesStore";
import {
  ReferenceCard,
  WorkspaceHeader,
  WorkspaceSidebar,
} from "@/components/workspace/public";
import { useToast } from "@/components/ui/Toast";
import { AddReferenceModal } from "@/components/workspace/AddReferenceModal";
import { EditReferenceModal } from "@/components/workspace/EditReferenceModal";
import { ManageMembersModal } from "@/components/workspace/ManageMembersModal";
import { TagManager } from "@/components/workspace/TagManager";
import { CreateFolderModal } from "@/components/workspace/CreateFolderModal";
import { ReferenceDetailsDrawer } from "@/components/workspace/ReferenceDetailsDrawer";
import { ActivityLogDrawer } from "@/components/workspace/ActivityLogDrawer";
import { WorkspaceChat } from "@/components/workspace/chat";
import type { ReferenceData, WorkspaceMember, FolderFilter } from "@/types";

interface WorkspaceClientProps {
  workspaceId: string;
  initialWorkspace: any;
  initialReferences: ReferenceData[];
  initialMembers: WorkspaceMember[];
  initialFolders: any[];
  initialUserRole: "owner" | "editor" | "viewer" | null;
}

export default function WorkspaceClient({
  workspaceId,
  initialWorkspace,
  initialReferences,
  initialMembers,
  initialFolders,
  initialUserRole,
}: WorkspaceClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const { setWorkspace, setMembers, setFolders, setUserRole, reset } = useWorkspaceStore();
  const { setReferences } = useReferencesStore();

  useEffect(() => {
    setWorkspace(initialWorkspace || null);
    setMembers((initialMembers || []) as any);
    setFolders((initialFolders || []) as any);
    setUserRole(initialUserRole);
    setReferences((initialReferences || []) as any);

    return () => {
      reset();
      setReferences([]);
    };
  }, [initialWorkspace, initialMembers, initialFolders, initialUserRole, initialReferences, reset, setFolders, setMembers, setReferences, setUserRole, setWorkspace]);

  const {
    workspace = null,
    owner = null,
    references = [],
    members = [],
    folders = [],
    loading = false,
    isOwner = false,
    getPermissions,
    deleteReference,
    removeMember,
    inviteMemberByEmail,
    deleteWorkspace,
    updateReference,
    refetch,
    createFolder,
    deleteFolder,
    moveReference,
  } = useWorkspace(workspaceId);

  const { isFollowing, toggleFollow } = useFollow(owner?.profile_id || "");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FolderFilter>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
  const [groupBy, setGroupBy] = useState<"type" | "folder" | "none">("type");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alphabetical" | "reverse-alphabetical">("newest");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<ReferenceData | null>(null);
  const [selectedReference, setSelectedReference] = useState<ReferenceData | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [expandedTypeGroups, setExpandedTypeGroups] = useState<Record<string, boolean>>({
    image: true,
    video: true,
    audio: true,
    document: true,
    link: true,
  });

  const [tags, setTags] = useState<string[]>([]);

  const permissions = getPermissions ? getPermissions() : {
    canView: false,
    canEdit: false,
    canManageMembers: false,
    canDeleteWorkspace: false,
  };

  useEffect(() => {
    if (!references.length) {
      setTags([]);
      return;
    }
    const tagSet = new Set<string>();
    references.forEach((ref: ReferenceData) => {
      (ref.tags || []).forEach((tag) => tagSet.add(tag.tag_name));
    });
    setTags(Array.from(tagSet).slice(0, 8));
  }, [references]);

  const filteredReferences = references.filter((ref: ReferenceData) => {
    const matchesSearch =
      searchQuery === "" ||
      ref.reference_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.tags?.some((tag) =>
        tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    let matchesFilter = true;
    if (activeFilter === null) {
      matchesFilter = true;
    } else if (activeFilter.type === "uncategorized") {
      matchesFilter = !ref.folder_id;
    } else if (activeFilter.type === "folder") {
      matchesFilter = ref.folder_id === activeFilter.folderId;
      if (matchesFilter && activeFilter.subType) {
        matchesFilter = ref.reference_type === activeFilter.subType;
      }
    }

    return matchesSearch && matchesFilter;
  })
  .sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.reference_created_at).getTime() - new Date(a.reference_created_at).getTime();
      case "oldest":
        return new Date(a.reference_created_at).getTime() - new Date(b.reference_created_at).getTime();
      case "alphabetical":
        return (a.reference_title || "").localeCompare(b.reference_title || "");
      case "reverse-alphabetical":
        return (b.reference_title || "").localeCompare(a.reference_title || "");
      default:
        return 0;
    }
  });

  const getGroupingMeta = (key: string, mode: "type" | "folder") => {
    if (mode === "type") {
      const meta = {
        image:    { label: "Images",    icon: <Image className="w-4 h-4" /> },
        video:    { label: "Videos",    icon: <PlayCircle className="w-4 h-4" /> },
        audio:    { label: "Audio",     icon: <Mic className="w-4 h-4" /> },
        document: { label: "Documents", icon: <FileText className="w-4 h-4" /> },
        link:     { label: "Links",     icon: <Link2 className="w-4 h-4" /> },
      }[key];
      return meta || { label: key, icon: <FileText className="w-4 h-4" /> };
    }

    if (key === "uncategorized") {
      return { label: "Uncategorized", icon: <List className="w-4 h-4" /> };
    }
    const folder = folders.find(f => f.folder_id === key);
    return { label: folder?.folder_name || "Unknown Collection", icon: <FolderInput className="w-4 h-4" /> };
  };

  const groupedReferences = useMemo(() => {
    if (groupBy === "none") return null;

    if (groupBy === "type") {
       const groups = filteredReferences.reduce((acc, ref) => {
          const t = ref.reference_type || "document";
          if (!acc[t]) acc[t] = [];
          acc[t].push(ref);
          return acc;
        }, {} as Record<string, ReferenceData[]>);
        return Object.entries(groups).sort((a, b) => {
          const order = ["image", "video", "audio", "document", "link"];
          return order.indexOf(a[0]) - order.indexOf(b[0]);
        });
    }

    if (groupBy === "folder") {
      const groups = filteredReferences.reduce((acc, ref) => {
        const f = ref.folder_id || "uncategorized";
        if (!acc[f]) acc[f] = [];
        acc[f].push(ref);
        return acc;
      }, {} as Record<string, ReferenceData[]>);
      return Object.entries(groups);
    }

    return null;
  }, [groupBy, filteredReferences, folders]);

  const compactGroupedReferences = useMemo(() => {
    if (groupBy === "folder") {
        const groups = filteredReferences.reduce((acc, ref) => {
            const f = ref.folder_id || "uncategorized";
            if (!acc[f]) acc[f] = [];
            acc[f].push(ref);
            return acc;
        }, {} as Record<string, ReferenceData[]>);
        return Object.entries(groups);
    }

    const REFERENCE_TYPE_ORDER = ["image", "video", "audio", "document", "link"];
    return REFERENCE_TYPE_ORDER
        .map((type) => [type, filteredReferences.filter((ref) => (ref.reference_type || "document") === type)] as const)
        .filter(([, refs]) => refs.length > 0);
  }, [groupBy, filteredReferences]);

  const toggleTypeGroup = (type: string) => {
    setExpandedTypeGroups((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const getCardType = (refType?: string): "image" | "link" | "color" | "video" => {
    if (refType === "image") return "image";
    if (refType === "video") return "video";
    return "link";
  };

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
      {permissions.canEdit && workspace && (
        <AddReferenceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          workspaceId={workspace.workspace_id}
          folders={folders}
          onReferenceAdded={() => {
            if (refetch) refetch();
          }}
        />
      )}

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

      {isOwner && (
        <CreateFolderModal
          isOpen={isCreateFolderOpen}
          onClose={() => setIsCreateFolderOpen(false)}
          onCreate={async (name) => {
            if (createFolder) await createFolder(name);
            showToast(`Folder "${name}" created!`);
          }}
        />
      )}

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

      <ReferenceDetailsDrawer
        reference={selectedReference}
        workspaceId={workspace?.workspace_id || ""}
        currentUserId={user?.id}
        workspaceMembers={members}
        isOpen={!!selectedReference}
        onClose={() => setSelectedReference(null)}
        onOpen={handleOpenReference}
        onEdit={(ref) => {
          setSelectedReference(null);
          setEditingReference(ref);
          setIsEditModalOpen(true);
        }}
        onDelete={(referenceId) => deleteReference?.(referenceId)}
        canEdit={permissions.canEdit}
        canDelete={permissions.canEdit}
      />

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
        isFollowing={isFollowing}
        onFollow={toggleFollow}
        onSettings={isOwner ? () => router.push(`/workspace/${workspace.workspace_id}/settings`) : undefined}
        onManageTags={isOwner ? () => setIsTagManagerOpen(true) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 float-in delay-2">
        <WorkspaceSidebar
          folders={folders}
          references={references}
          tags={tags}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onTagClick={handleTagClick}
          canManageFolders={!!isOwner}
          onCreateFolder={() => setIsCreateFolderOpen(true)}
          onDeleteFolder={async (folderId) => {
            if (deleteFolder) {
              await deleteFolder(folderId);
              setActiveFilter(null);
              showToast("Folder deleted");
            }
          }}
        />

        <main>
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
              <div className="relative group">
                <button className="text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1">
                  <span className="text-stone-400 font-normal">Group by:</span>
                  <span className="capitalize">{groupBy === "type" ? "Type" : groupBy === "folder" ? "Collection" : "None"}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-stone-100 p-1 hidden group-hover:block z-20">
                  <button onClick={() => setGroupBy("type")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${groupBy === 'type' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Type</button>
                  <button onClick={() => setGroupBy("folder")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${groupBy === 'folder' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Collection</button>
                  <div className="h-px bg-stone-100 my-1" />
                  <button onClick={() => setGroupBy("none")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${groupBy === 'none' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>None</button>
                </div>
              </div>
              <div className="w-px h-6 bg-stone-200 mx-1"></div>
              <div className="relative group">
                <button className="text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1">
                  <ArrowDownUp className="w-4 h-4" />
                  <span className="capitalize hidden xl:inline">{sortBy === "newest" ? "Recent" : sortBy === "alphabetical" ? "A-Z" : sortBy.replace("-", " ")}</span>
                  <span className="xl:hidden">Sort</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 p-1 hidden group-hover:block z-20">
                  <button onClick={() => setSortBy("newest")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${sortBy === 'newest' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Newest first</button>
                  <button onClick={() => setSortBy("oldest")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${sortBy === 'oldest' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Oldest first</button>
                  <div className="h-px bg-stone-100 my-1" />
                  <button onClick={() => setSortBy("alphabetical")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${sortBy === 'alphabetical' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Alphabetical (A-Z)</button>
                  <button onClick={() => setSortBy("reverse-alphabetical")} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-50 ${sortBy === 'reverse-alphabetical' ? 'font-bold text-stone-900 bg-stone-50' : 'text-stone-500'}`}>Alphabetical (Z-A)</button>
                </div>
              </div>
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
              <button
                onClick={() => setViewMode("compact")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                  viewMode === "compact"
                    ? "bg-stone-900 text-white"
                    : "text-stone-500 bg-stone-100 hover:bg-stone-200"
                }`}
              >
                Compact
              </button>
            </div>
          </div>

          {viewMode === "compact" ? (
            <div className="bg-white rounded-4xl border border-stone-100 overflow-hidden">
              {compactGroupedReferences.map(([key, refs], index) => {
                const isExpanded = !!expandedTypeGroups[key];
                const meta = getGroupingMeta(key, groupBy === "folder" ? "folder" : "type");

                return (
                  <section key={key} className={index !== 0 ? "border-t border-stone-100" : ""}>
                    <button
                      type="button"
                      onClick={() => toggleTypeGroup(key)}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50 transition-colors"
                    >
                      <span className="text-stone-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                      <span className="text-stone-400">{meta.icon}</span>
                      <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest text-left flex-1">
                        {meta.label}
                      </h3>
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-full font-bold">
                        {refs.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pb-2">
                        {refs.map((ref) => (
                          <button
                            key={ref.reference_id}
                            type="button"
                            onClick={() => setSelectedReference(ref)}
                            className="w-full px-5 py-3 text-left hover:bg-stone-50 transition-colors border-t border-stone-100/70"
                          >
                            <p className="text-sm font-semibold text-stone-900 truncate">
                              {ref.reference_title || "Untitled"}
                            </p>
                            <p className="text-xs text-stone-400 truncate mt-0.5">
                              {ref.reference_metadata?.source || ref.reference_url}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : groupedReferences ? (
            <div className="space-y-10">
              {groupedReferences.map(([key, refs]) => {
                const meta = getGroupingMeta(key, groupBy === "folder" ? "folder" : "type");
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-stone-400">{meta.icon}</span>
                      <h3 className="font-bold text-stone-700 text-sm uppercase tracking-widest">{meta.label}</h3>
                      <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">{refs.length}</span>
                    </div>
                    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                      {refs.map((ref: ReferenceData) => (
                        <ReferenceCard
                          key={ref.reference_id}
                          id={ref.reference_id}
                          title={ref.reference_title || "Untitled"}
                          source={ref.reference_metadata?.source || ref.reference_url || ""}
                          referenceStatus={ref.reference_status}
                          imageUrl={ref.reference_metadata?.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"}
                          tags={ref.tags?.map(t => t.tag_name) || []}
                          type={getCardType(ref.reference_type)}
                          colorPalette={ref.reference_metadata?.colorPalette}
                          folders={folders}
                          currentFolderId={ref.folder_id}
                          onSave={() => handleSaveReference(ref.reference_id)}
                          onOpen={() => handleOpenReference(ref.reference_url)}
                          onClick={() => setSelectedReference(ref)}
                          onEdit={() => { setEditingReference(ref); setIsEditModalOpen(true); }}
                          onDelete={() => deleteReference?.(ref.reference_id)}
                          onMove={(folderId) => moveReference?.(ref.reference_id, folderId)}
                          canEdit={permissions.canEdit}
                          canDelete={permissions.canEdit}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              {filteredReferences.map((ref: ReferenceData) => (
                <ReferenceCard
                  key={ref.reference_id}
                  id={ref.reference_id}
                  title={ref.reference_title || "Untitled"}
                  source={ref.reference_metadata?.source || ref.reference_url || ""}
                  referenceStatus={ref.reference_status}
                  imageUrl={ref.reference_metadata?.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"}
                  tags={ref.tags?.map(t => t.tag_name) || []}
                  type={getCardType(ref.reference_type)}
                  colorPalette={ref.reference_metadata?.colorPalette}
                  folders={folders}
                  currentFolderId={ref.folder_id}
                  onSave={() => handleSaveReference(ref.reference_id)}
                  onOpen={() => handleOpenReference(ref.reference_url)}
                  onClick={() => setSelectedReference(ref)}
                  onEdit={() => { setEditingReference(ref); setIsEditModalOpen(true); }}
                  onDelete={() => deleteReference?.(ref.reference_id)}
                  onMove={(folderId) => moveReference?.(ref.reference_id, folderId)}
                  canEdit={permissions.canEdit}
                  canDelete={permissions.canEdit}
                />
              ))}
            </div>
          )}

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

      {permissions.canEdit && (
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-linear-to-tr from-lime-400 to-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-lime-500/40 hover:scale-110 hover:rotate-90 transition-all duration-500 z-30"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {permissions.canManageMembers && (
        <button
          onClick={() => setIsMembersModalOpen(true)}
          className={`fixed bottom-8 ${permissions.canEdit ? 'right-28' : 'right-8'} w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all duration-300 z-30`}
          title="Manage Members"
        >
          <Users className="w-6 h-6" />
        </button>
      )}

      {members.some((m: WorkspaceMember) => m.profile_id === user?.id) && (
        <button
          onClick={() => setIsActivityLogOpen(true)}
          className={`fixed bottom-8 ${
            permissions.canManageMembers && permissions.canEdit ? 'right-46' :
            permissions.canManageMembers || permissions.canEdit ? 'right-28' :
            'right-8'
          } w-14 h-14 bg-white rounded-full flex items-center justify-center text-stone-900 shadow-xl hover:scale-110 transition-all duration-300 z-30 border border-stone-100`}
          title="Activity Log"
        >
          <Activity className="w-6 h-6" />
        </button>
      )}

      {members.some((m: WorkspaceMember) => m.profile_id === user?.id) && (
        <button
          onClick={() => setIsChatOpen(true)}
          className={`fixed bottom-8 ${
            permissions.canManageMembers && permissions.canEdit ? 'right-64' :
            permissions.canManageMembers || permissions.canEdit ? 'right-46' :
            'right-28'
          } w-14 h-14 bg-[#1c1917] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all duration-300 z-30`}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      <ActivityLogDrawer
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        workspaceId={workspaceId || ""}
        references={references}
        members={members}
      />

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
