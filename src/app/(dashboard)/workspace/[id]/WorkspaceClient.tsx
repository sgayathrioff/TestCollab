"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowDownUp, LayoutGrid, List, Plus, MessageCircle, Users, Activity, ChevronDown, Tag, X, Pencil, Trash2, Check, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useFollow } from "@/hooks/useFollow";
import { useToast } from "@/components/ui/Toast";
import {
  ReferenceCard,
  WorkspaceHeader,
  WorkspaceSidebar,
} from "@/components/workspace/public";
import { AddReferenceModal } from "@/components/workspace/AddReferenceModal";
import { EditReferenceModal } from "@/components/workspace/EditReferenceModal";
import { ManageMembersModal } from "@/components/workspace/ManageMembersModal";
import { TagManager } from "@/components/workspace/TagManager";
import { CreateFolderModal } from "@/components/workspace/CreateFolderModal";
import { ReferenceDetailsDrawer } from "@/components/workspace/ReferenceDetailsDrawer";
import { ActivityLogDrawer } from "@/components/workspace/ActivityLogDrawer";
import { WorkspaceChat } from "@/components/workspace/chat";
import type { ReferenceData, WorkspaceMember, WorkspaceFolder, FolderFilter } from "@/types";
import { supabase } from "@/lib/supabase";

interface WorkspaceClientProps {
  workspaceId: string;
  initialWorkspace: any;
  initialReferences: ReferenceData[];
  initialMembers: WorkspaceMember[];
  initialFolders: any[];
  initialUserRole: "owner" | "member" | "viewer" | null;
}

const STORAGE_BUCKET = "Link-UpWorkpace";

export default function WorkspaceClient({ workspaceId }: WorkspaceClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const {
    workspace,
    owner,
    references,
    members,
    folders,
    loading,
    getPermissions,
    deleteReference,
    removeMember,
    updateMemberRole,
    updateMemberCategory,
    inviteMemberByEmail,
    deleteWorkspace,
    updateReference,
    refetch,
    createFolder,
    deleteFolder,
    moveReference,
  } = useWorkspace(workspaceId);

  const typedReferences = (references || []) as ReferenceData[];
  const typedMembers = (members || []) as WorkspaceMember[];
  const typedFolders = (folders || []) as WorkspaceFolder[];

  const { isFollowing, toggleFollow } = useFollow(owner?.profile_id || "");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FolderFilter>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupBy, setGroupBy] = useState<"type" | "folder" | "tag" | "none">("type");
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
  const [categoryMenuMemberId, setCategoryMenuMemberId] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");

  const permissions = getPermissions ? getPermissions() : {
    canView: false,
    canEdit: false,
    canManageMembers: false,
    canDeleteWorkspace: false,
  };

  const allTags = useMemo(() => {
    const tagMap = new Map<string, { tag_id: string; tag_name: string; tag_color: string }>();
    typedReferences.forEach((ref) => {
      (ref.tags || []).forEach((tag) => {
        if (!tagMap.has(tag.tag_id)) tagMap.set(tag.tag_id, tag);
      });
    });
    return Array.from(tagMap.values());
  }, [typedReferences]);

  const tags = useMemo(() => allTags.map((t) => t.tag_name).slice(0, 12), [allTags]);

  // Seed categories from member data on first load
  useEffect(() => {
    if (typedMembers.length > 0 && categories.length === 0) {
      const derived = Array.from(
        new Set(typedMembers.map((m) => m.member_category?.trim()).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b));
      if (derived.length > 0) setCategories(derived);
    }
  }, [typedMembers]);

  const memberCategoryGroups = useMemo(() => {
    const grouped = typedMembers.reduce((acc, member) => {
      const key = member.member_category?.trim() || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(member);
      return acc;
    }, {} as Record<string, WorkspaceMember[]>);

    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
  }, [typedMembers]);

  // Category management handlers
  const handleAddCategory = () => {
    const val = newCategoryInput.trim();
    if (!val || categories.includes(val)) return;
    setCategories((prev) => [...prev, val].sort((a, b) => a.localeCompare(b)));
    setNewCategoryInput("");
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || categories.includes(trimmed)) {
      setEditingCategory(null);
      return;
    }
    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)).sort((a, b) => a.localeCompare(b)));
    setEditingCategory(null);
    // Update all members with old category
    const affected = typedMembers.filter((m) => m.member_category?.trim() === oldName);
    for (const m of affected) {
      await updateMemberCategory?.(m.profile_id, trimmed);
    }
    showToast("Category renamed");
  };

  const handleDeleteCategory = async (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
    const affected = typedMembers.filter((m) => m.member_category?.trim() === cat);
    for (const m of affected) {
      await updateMemberCategory?.(m.profile_id, null);
    }
    showToast("Category deleted");
  };

  const filteredReferences = useMemo(() => {
    return typedReferences
      .filter((ref) => {
        const matchesSearch =
          searchQuery === "" ||
          ref.reference_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ref.tags?.some((tag) => tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase()));

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
  }, [typedReferences, searchQuery, activeFilter, sortBy]);

  const groupedReferences = useMemo(() => {
    if (groupBy === "none") return [["All", filteredReferences] as [string, ReferenceData[]]];

    if (groupBy === "type") {
      const groups = filteredReferences.reduce((acc, ref) => {
        const key = ref.reference_type || "document";
        if (!acc[key]) acc[key] = [];
        acc[key].push(ref);
        return acc;
      }, {} as Record<string, ReferenceData[]>);

      const order = ["image", "video", "audio", "document", "link"];
      return Object.entries(groups).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    }

    if (groupBy === "tag") {
      const groups: Record<string, ReferenceData[]> = {};
      filteredReferences.forEach((ref) => {
        const refTags = ref.tags || [];
        if (refTags.length === 0) {
          (groups["untagged"] ||= []).push(ref);
        } else {
          refTags.forEach((tag) => {
            (groups[tag.tag_id] ||= []).push(ref);
          });
        }
      });
      // Sort tag groups by name; push untagged to end
      return Object.entries(groups).sort(([a], [b]) => {
        if (a === "untagged") return 1;
        if (b === "untagged") return -1;
        const nameA = allTags.find((t) => t.tag_id === a)?.tag_name ?? "";
        const nameB = allTags.find((t) => t.tag_id === b)?.tag_name ?? "";
        return nameA.localeCompare(nameB);
      });
    }

    const groups = filteredReferences.reduce((acc, ref) => {
      const key = ref.folder_id || "uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(ref);
      return acc;
    }, {} as Record<string, ReferenceData[]>);

    return Object.entries(groups);
  }, [filteredReferences, groupBy, allTags]);

  const resolveGroupLabel = (groupKey: string) => {
    if (groupBy === "type") return groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
    if (groupBy === "tag") {
      if (groupKey === "untagged") return "Untagged";
      return allTags.find((t) => t.tag_id === groupKey)?.tag_name ?? "Tag";
    }
    if (groupKey === "uncategorized") return "Uncategorized";
    return typedFolders.find((f) => f.folder_id === groupKey)?.folder_name || "Collection";
  };

  const getCardType = (refType?: string): "image" | "link" | "color" | "video" => {
    if (refType === "image") return "image";
    if (refType === "video") return "video";
    return "link";
  };

  const getReferenceSource = (ref: ReferenceData) => {
    if (ref.reference_metadata?.source) return ref.reference_metadata.source;
    if (ref.reference_metadata?.source_url) {
      try {
        return new URL(ref.reference_metadata.source_url).hostname;
      } catch {
        return "External";
      }
    }
    try {
      return new URL(ref.reference_url).hostname;
    } catch {
      return "Reference";
    }
  };

  const isLikelyImageUrl = (url?: string | null) => {
    if (!url) return false;
    return /(\.png|\.jpe?g|\.gif|\.webp|\.avif|\.svg)(\?.*)?$/i.test(url) ||
      url.includes("/storage/v1/object/public/");
  };

  const isSafePreviewUrl = (url?: string | null) => {
    if (!url) return false;
    if (url.startsWith("/")) return true;
    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseBase) return false;
    return url.startsWith(`${supabaseBase}/storage/`);
  };

  const getReferencePreview = (ref: ReferenceData) => {
    const thumbnailStored = ref.reference_metadata?.thumbnailStoredUrl;
    const thumbnail = ref.reference_metadata?.thumbnail;

    if (ref.reference_type === "image") {
      if (isLikelyImageUrl(thumbnailStored) && isSafePreviewUrl(thumbnailStored)) return thumbnailStored as string;
      if (isLikelyImageUrl(thumbnail) && isSafePreviewUrl(thumbnail)) return thumbnail as string;
      if (isLikelyImageUrl(ref.reference_url) && isSafePreviewUrl(ref.reference_url)) return ref.reference_url;
      return "/window.svg";
    }

    if (ref.reference_type === "video") {
      if (isLikelyImageUrl(thumbnailStored) && isSafePreviewUrl(thumbnailStored)) return thumbnailStored as string;
      if (isLikelyImageUrl(thumbnail) && isSafePreviewUrl(thumbnail)) return thumbnail as string;
      return "/next.svg";
    }

    if (ref.reference_type === "audio") return "/vercel.svg";
    if (ref.reference_type === "document") return "/file.svg";
    return "/file.svg";
  };

  const handleDeleteReference = useCallback(async (ref: ReferenceData) => {
    try {
      const urlParts = (ref.reference_url || "").split(`/storage/v1/object/public/${STORAGE_BUCKET}/`);
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      }
    } catch {
      // best effort storage cleanup
    }

    try {
      await deleteReference(ref.reference_id);
      showToast("Reference removed");
    } catch (err: any) {
      showToast(err?.message || "Failed to remove reference");
    }
  }, [deleteReference, showToast]);

  const handleDeleteWorkspace = async () => {
    try {
      setIsDeleting(true);
      await deleteWorkspace?.();
      showToast("Workspace deleted");
      router.push("/dashboard");
    } catch (err: any) {
      showToast(err?.message || "Failed to delete workspace");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleOpenReference = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied");
  }, [showToast]);

  const handleDuplicate = useCallback(() => {
    showToast("Duplicated to your dashboard");
  }, [showToast]);

  const handleMemberCategoryChange = async (memberId: string, selected: string) => {
    try {
      if (selected === "__custom__") {
        setTargetMemberId(memberId);
        setIsCategoryModalOpen(true);
        setCustomCategoryInput("");
        setCategoryMenuMemberId(null);
        return;
      }

      await updateMemberCategory?.(memberId, selected === "Unassigned" ? null : selected);
      setCategoryMenuMemberId(null);
      showToast("Member category updated");
    } catch (err: any) {
      showToast(err?.message || "Failed to update category");
    }
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

  if (!permissions.canView) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Private Workspace</h2>
        <p className="text-stone-500">You do not have access to this workspace.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <WorkspaceHeader
        id={workspace.workspace_id}
        title={workspace.workspace_title || "Untitled Workspace"}
        description={workspace.workspace_description || "No description"}
        coverImage={workspace.workspace_cover_image || undefined}
        category="Workspace"
        views={typedReferences.length * 3}
        likes={typedReferences.length}
        author={{
          id: owner?.profile_id || workspace.workspace_owner_id,
          name: owner?.display_name || "Workspace Owner",
          avatar: owner?.profile_avatar_url || null,
        }}
        isOwner={workspace.workspace_owner_id === user?.id}
        onLike={() => showToast("Added to favorites")}
        onShare={handleShare}
        onDuplicate={handleDuplicate}
        onFollow={() => toggleFollow()}
        isFollowing={isFollowing}
        onInvite={() => setIsMembersModalOpen(true)}
        onSettings={() => router.push(`/workspace/${workspace.workspace_id}/settings`)}
        onManageTags={() => setIsTagManagerOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-6 mt-6">
        <WorkspaceSidebar
          folders={typedFolders}
          references={typedReferences}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          canManageFolders={permissions.canManageMembers}
          onCreateFolder={() => setIsCreateFolderOpen(true)}
          onDeleteFolder={async (folderId) => {
            try {
              await deleteFolder?.(folderId);
              showToast("Folder deleted");
            } catch (err: any) {
              showToast(err?.message || "Failed to delete folder");
            }
          }}
        />

        <main>
          {/* Search Bar - Dedicated Row for Maximum Width */}
          <div className="bg-white rounded-4xl border border-stone-100 p-5 mb-4 shadow-sm float-in">
            <div className="relative w-full group">
              <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-lime-600 transition-colors" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search references by name, tag, or collection..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-stone-200 text-base font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-200 transition-all bg-stone-50/30 font-display"
              />
            </div>
          </div>

          {/* Action Toolbar - Compact and Clean */}
          <div className="bg-white rounded-3xl border border-stone-100 p-3 mb-8 flex items-center justify-between gap-4 float-in delay-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2">
              {permissions.canEdit && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-[#1c1917] text-white font-bold text-sm flex items-center gap-2 shrink-0 hover:bg-black transition-colors shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add Reference
                </button>
              )}

              <div className="w-px h-8 bg-stone-100 mx-1 shrink-0" />



              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="px-3 py-2.5 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors bg-white shadow-sm flex items-center justify-center"
                title="Manage members"
              >
                <Users className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={() => setIsActivityLogOpen(true)}
                className="px-3 py-2.5 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors bg-white shadow-sm flex items-center justify-center"
                title="Activity log"
              >
                <Activity className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-px h-8 bg-stone-100 mx-1 shrink-0" />

              <div className="relative shrink-0">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-700 bg-white hover:border-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                >
                  <option value="type">Group: Type</option>
                  <option value="folder">Group: Folder</option>
                  <option value="tag">Group: Tag</option>
                  <option value="none">Group: None</option>
                </select>
                <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-2xl border border-stone-200 text-sm font-semibold text-stone-700 bg-white hover:border-stone-300 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400/20"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="reverse-alphabetical">Z-A</option>
                </select>
                <ArrowDownUp className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="w-px h-8 bg-stone-100 mx-1 shrink-0" />

              <div className="flex items-center gap-1.5 p-1 bg-stone-50 rounded-2xl border border-stone-100">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "grid" ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600"}`}
                  title="List view"
                >
                  <List className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {filteredReferences.length === 0 ? (
            <div className="bg-white rounded-4xl border border-dashed border-stone-200 p-12 text-center text-stone-500 float-in delay-2">
              No references found match your search.
            </div>
          ) : (
            <div className="space-y-8 float-in delay-2">
              {groupedReferences.map(([groupKey, groupRefs]) => (
                <section key={groupKey}>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                      {resolveGroupLabel(groupKey)}
                    </h3>
                    <span className="text-xs font-bold text-stone-300 bg-stone-50 px-2.5 py-1 rounded-full">{groupRefs.length}</span>
                  </div>

                  <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                    {groupRefs.map((ref) => (
                      <ReferenceCard
                        key={ref.reference_id}
                        id={ref.reference_id}
                        title={ref.reference_title || "Untitled"}
                        source={getReferenceSource(ref)}
                        referenceStatus={ref.reference_status}
                        imageUrl={getReferencePreview(ref)}
                        tags={(ref.tags || []).map((t) => t.tag_name)}
                        type={getCardType(ref.reference_type)}
                        colorPalette={ref.reference_metadata?.colorPalette}
                        folders={typedFolders}
                        currentFolderId={ref.folder_id || null}
                        onOpen={() => handleOpenReference(ref.reference_url)}
                        onClick={() => setSelectedReference(ref)}
                        onDelete={permissions.canEdit ? () => handleDeleteReference(ref) : undefined}
                        onEdit={permissions.canEdit ? () => {
                          setEditingReference(ref);
                          setIsEditModalOpen(true);
                        } : undefined}
                        onMove={permissions.canEdit ? async (folderId) => {
                          try {
                            await moveReference?.(ref.reference_id, folderId);
                            showToast("Reference moved");
                          } catch (err: any) {
                            showToast(err?.message || "Failed to move reference");
                          }
                        } : undefined}
                        canDelete={permissions.canEdit}
                        canEdit={permissions.canEdit}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        <aside className="hidden lg:block sticky top-24 h-fit">
          <div className="bg-white rounded-4xl border border-stone-100 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Member Categories</h3>
              <span className="text-xs text-stone-400">{typedMembers.length}</span>
            </div>

            {/* Owner: Manage Categories Button */}
            {permissions.canManageMembers && (
              <button
                onClick={() => setShowCategoryManager((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Settings2 className="w-3.5 h-3.5" /> Manage Categories</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCategoryManager ? "rotate-180" : ""}`} />
              </button>
            )}

            {/* Category Manager Panel */}
            {showCategoryManager && permissions.canManageMembers && (
              <div className="bg-stone-50 rounded-2xl border border-stone-100 p-3 space-y-2">
                {categories.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-2">No categories yet</p>
                )}
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center gap-2 group">
                    {editingCategory === cat ? (
                      <>
                        <input
                          autoFocus
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCategory(cat, editCategoryValue);
                            if (e.key === "Escape") setEditingCategory(null);
                          }}
                          onBlur={() => handleRenameCategory(cat, editCategoryValue)}
                          className="flex-1 text-xs px-2 py-1.5 rounded-xl border border-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-400/40 bg-white"
                        />
                        <button onClick={() => handleRenameCategory(cat, editCategoryValue)} className="p-1 text-lime-600 hover:text-lime-700">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-xs font-medium text-stone-700 truncate">{cat}</span>
                        <button
                          onClick={() => { setEditingCategory(cat); setEditCategoryValue(cat); }}
                          className="p-1 text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {/* Add new category */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                    placeholder="New category name..."
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-400/40 bg-white"
                  />
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryInput.trim() || categories.includes(newCategoryInput.trim())}
                    className="p-1.5 rounded-xl bg-stone-900 text-white hover:bg-black transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Member list grouped by category */}
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
              {memberCategoryGroups.map(([category, categoryMembers]) => (
                <div key={category} className="border border-stone-100 rounded-2xl p-3">
                  <p className="text-sm font-semibold text-stone-800 mb-2">{category}</p>
                  <div className="space-y-2">
                    {categoryMembers.map((member) => {
                      const displayName = member.profile?.display_name || member.profile?.profile_email || "Member";
                      const email = member.profile?.profile_email || "No email";
                      const avatar = member.profile?.profile_avatar_url || "";
                      const canEditCategory = permissions.canManageMembers && member.member_role !== "owner";
                      return (
                        <div key={member.profile_id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-2.5 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {avatar ? (
                              <img src={avatar} alt={displayName} className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 text-[10px] font-bold flex items-center justify-center">
                                {(displayName[0] || "U").toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-stone-800 truncate">{displayName}</p>
                              <p className="text-[11px] text-stone-500 truncate">{email}</p>
                            </div>
                          </div>

                          {canEditCategory ? (
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setCategoryMenuMemberId((prev) => (prev === member.profile_id ? null : member.profile_id))}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 text-[11px] text-stone-600 bg-white"
                              >
                                Category <ChevronDown className="w-3 h-3" />
                              </button>
                              {categoryMenuMemberId === member.profile_id && (
                                <div className="absolute right-0 mt-2 w-44 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1">
                                  <button
                                    onClick={() => handleMemberCategoryChange(member.profile_id, "Unassigned")}
                                    className="w-full text-left px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
                                  >
                                    Unassigned
                                  </button>
                                  {categories.map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => handleMemberCategoryChange(member.profile_id, option)}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 ${
                                        member.member_category === option ? "text-lime-700 font-semibold" : "text-stone-700"
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  ))}
                                  <div className="border-t border-stone-100 mt-1 pt-1">
                                    <button
                                      onClick={() => handleMemberCategoryChange(member.profile_id, "__custom__")}
                                      className="w-full text-left px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50"
                                    >
                                      + New Category
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 shrink-0">
                              {member.member_role === "owner" ? "Owner" : member.member_role === "viewer" ? "Viewer" : "Member"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {permissions.canEdit && (
        <AddReferenceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          workspaceId={workspace.workspace_id}
          folders={typedFolders}
          onReferenceAdded={() => refetch?.()}
        />
      )}

      {permissions.canEdit && editingReference && (
        <EditReferenceModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingReference(null);
          }}
          workspaceId={workspace.workspace_id}
          reference={editingReference}
          onUpdate={async (referenceId, updates) => {
            await updateReference?.(referenceId, updates);
          }}
          onUpdated={() => refetch?.()}
        />
      )}

      <ManageMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={typedMembers}
        currentUserId={user?.id}
        ownerId={workspace.workspace_owner_id}
        canManageMembers={permissions.canManageMembers}
        onInviteMember={async (email) => {
          await inviteMemberByEmail?.(email);
          showToast("Invite sent");
        }}
        onRemoveMember={async (profileId) => {
          await removeMember?.(profileId);
          showToast("Member removed");
        }}
        onUpdateRole={async (profileId, role) => {
          await updateMemberRole?.(profileId, role);
          showToast("Member role updated");
        }}
      />

      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        workspaceId={workspace.workspace_id}
        onTagsUpdated={() => refetch?.()}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={async (name) => {
          await createFolder?.(name);
          showToast("Folder created");
        }}
      />

      <ReferenceDetailsDrawer
        reference={selectedReference}
        workspaceId={workspace.workspace_id}
        currentUserId={user?.id}
        workspaceMembers={typedMembers}
        isOpen={!!selectedReference}
        onClose={() => setSelectedReference(null)}
        onOpen={handleOpenReference}
        onEdit={permissions.canEdit ? (reference) => {
          setEditingReference(reference);
          setSelectedReference(null);
          setIsEditModalOpen(true);
        } : undefined}
        onDelete={permissions.canEdit ? async (referenceId) => {
          const ref = typedReferences.find((r) => r.reference_id === referenceId);
          if (ref) await handleDeleteReference(ref);
          setSelectedReference(null);
        } : undefined}
        canEdit={permissions.canEdit}
        canDelete={permissions.canEdit}
      />

      <ActivityLogDrawer
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        workspaceId={workspace.workspace_id}
        references={typedReferences}
        members={typedMembers}
      />

      <WorkspaceChat
        workspaceId={workspace.workspace_id}
        currentUserId={user?.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      {permissions.canDeleteWorkspace && isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => !isDeleting && setIsDeleteConfirmOpen(false)} />
          <div className="relative z-10 bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Workspace?</h3>
            <p className="text-sm text-stone-500 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative z-10 bg-white rounded-4xl p-8 w-full max-w-sm shadow-2xl float-in">
            <h3 className="text-xl font-bold text-stone-900 mb-2">New Category</h3>
            <p className="text-sm text-stone-500 mb-6 font-medium">Enter a custom category for this member.</p>
            <input
              autoFocus
              value={customCategoryInput}
              onChange={(e) => setCustomCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customCategoryInput.trim()) {
                  const val = customCategoryInput.trim();
                  if (targetMemberId) {
                    if (!categories.includes(val)) setCategories((prev) => [...prev, val].sort((a, b) => a.localeCompare(b)));
                    updateMemberCategory?.(targetMemberId, val);
                    showToast("Category updated");
                    setIsCategoryModalOpen(false);
                  }
                }
              }}
              placeholder="e.g. Design Team, Legal, Engineering"
              className="w-full px-4 py-3.5 rounded-2xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-lime-400/60 mb-6 bg-stone-50/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex-1 px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const val = customCategoryInput.trim();
                  if (!val || !targetMemberId) return;
                  if (!categories.includes(val)) setCategories((prev) => [...prev, val].sort((a, b) => a.localeCompare(b)));
                  await updateMemberCategory?.(targetMemberId, val);
                  showToast("Category updated");
                  setIsCategoryModalOpen(false);
                }}
                disabled={!customCategoryInput.trim()}
                className="flex-2 px-6 py-3.5 rounded-2xl bg-stone-900 text-white font-bold text-sm hover:bg-black transition-colors disabled:opacity-50"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 left-8 z-50 w-16 h-16 rounded-full bg-stone-900 text-lime-400 shadow-2xl hover:bg-black hover:scale-105 transition-all flex items-center justify-center border-4 border-white group float-in delay-3"
        title="Open workspace chat"
      >
        <div className="relative">
          <MessageCircle className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-lime-500 rounded-full border-2 border-stone-900 animate-pulse"></span>
        </div>
      </button>
    </div>
  );
}
