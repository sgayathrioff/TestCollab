"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, Folder, Image, PlayCircle, FileText, Mic, Inbox, Trash2 } from "lucide-react";
import type { WorkspaceFolder, ReferenceData, FolderFilter } from "@/types";

const SUB_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  image:    { label: "Images",    icon: <Image className="w-3.5 h-3.5" />,       color: "text-sky-500" },
  video:    { label: "Videos",    icon: <PlayCircle className="w-3.5 h-3.5" />,   color: "text-rose-500" },
  audio:    { label: "Audio",     icon: <Mic className="w-3.5 h-3.5" />,          color: "text-purple-500" },
  document: { label: "Documents", icon: <FileText className="w-3.5 h-3.5" />,     color: "text-amber-500" },
};

interface WorkspaceSidebarProps {
  folders: WorkspaceFolder[];
  references: ReferenceData[];
  tags: string[];
  activeFilter: FolderFilter;
  onFilterChange: (filter: FolderFilter) => void;
  onTagClick?: (tag: string) => void;
  canManageFolders?: boolean;
  onCreateFolder?: () => void;
  onDeleteFolder?: (folderId: string) => void;
}

function getSubTypeCounts(refs: ReferenceData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  refs.forEach((r) => {
    const t = r.reference_type || "document";
    counts[t] = (counts[t] || 0) + 1;
  });
  return counts;
}

function isFilterActive(filter: FolderFilter, check: FolderFilter): boolean {
  if (filter === null && check === null) return true;
  if (filter === null || check === null) return false;
  if (filter.type === "uncategorized" && check.type === "uncategorized") return true;
  if (filter.type === "folder" && check.type === "folder") {
    return filter.folderId === check.folderId && filter.subType === check.subType;
  }
  return false;
}

export function WorkspaceSidebar({
  folders,
  references,
  tags,
  activeFilter,
  onFilterChange,
  onTagClick,
  canManageFolders = false,
  onCreateFolder,
  onDeleteFolder,
}: WorkspaceSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  const toggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const uncategorizedRefs = references.filter((r) => !r.folder_id);
  const totalCount = references.length;

  return (
    <aside className="hidden lg:block sticky top-32 h-fit bg-white rounded-[40px] p-6 shadow-sm border border-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-bold text-stone-400 uppercase tracking-widest text-xs">
          Collections
        </h3>
        {canManageFolders && (
          <button
            onClick={onCreateFolder}
            title="New collection"
            className="text-stone-400 hover:text-lime-600 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      <ul className="space-y-1 mb-8">
        {/* All References */}
        <li>
          <button
            onClick={() => onFilterChange(null)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${
              isFilterActive(activeFilter, null)
                ? "bg-[#1c1917] text-white shadow-lg shadow-stone-900/10"
                : "text-stone-600 hover:bg-stone-50 font-medium"
            }`}
          >
            <span className={`flex items-center gap-2 ${isFilterActive(activeFilter, null) ? "font-bold" : ""}`}>
              <Inbox className="w-4 h-4 shrink-0" />
              All References
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isFilterActive(activeFilter, null) ? "bg-stone-700" : "bg-stone-100 text-stone-400"}`}>
              {totalCount}
            </span>
          </button>
        </li>

        {/* Folder rows */}
        {folders.map((folder) => {
          const folderRefs = references.filter((r) => r.folder_id === folder.folder_id);
          const subCounts = getSubTypeCounts(folderRefs);
          const isExpanded = expandedFolders.has(folder.folder_id);
          const isFolderActive =
            activeFilter !== null &&
            activeFilter.type === "folder" &&
            activeFilter.folderId === folder.folder_id;

          return (
            <li key={folder.folder_id}>
              {/* Folder row */}
              <div
                className="relative"
                onMouseEnter={() => setHoveredFolder(folder.folder_id)}
                onMouseLeave={() => setHoveredFolder(null)}
              >
                <div
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-2xl transition-colors ${
                    isFolderActive && !("subType" in (activeFilter as any) && (activeFilter as any).subType)
                      ? "bg-[#1c1917] text-white shadow-lg shadow-stone-900/10"
                      : "text-stone-600 hover:bg-stone-50 font-medium"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(folder.folder_id)}
                    className="shrink-0 text-inherit opacity-60 hover:opacity-100 p-2"
                    aria-label={isExpanded ? "Collapse collection" : "Expand collection"}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({ type: "folder", folderId: folder.folder_id });
                      if (!isExpanded) toggleExpand(folder.folder_id);
                    }}
                    className="flex-1 flex items-center gap-2 pr-10 py-2"
                  >
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className={`flex-1 text-left truncate text-sm ${isFolderActive ? "font-bold" : ""}`}>
                      {folder.folder_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${isFolderActive ? "bg-stone-700" : "bg-stone-100 text-stone-400"}`}>
                      {folderRefs.length}
                    </span>
                  </button>
                </div>

                {/* Delete button (owner only) */}
                {canManageFolders && hoveredFolder === folder.folder_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder?.(folder.folder_id);
                    }}
                    title="Delete collection"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-red-500 transition-colors z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sub-type rows */}
              {isExpanded && Object.keys(SUB_TYPE_META).map((subType) => {
                const cnt = subCounts[subType] || 0;
                if (cnt === 0) return null;
                const meta = SUB_TYPE_META[subType];
                const subFilter: FolderFilter = { type: "folder", folderId: folder.folder_id, subType };
                const isSubActive = isFilterActive(activeFilter, subFilter);
                return (
                  <button
                    key={subType}
                    onClick={() => onFilterChange(subFilter)}
                    className={`w-full flex items-center gap-2 pl-12 pr-4 py-2 rounded-xl transition-colors text-sm ml-2 ${
                      isSubActive
                        ? "bg-stone-100 text-stone-900 font-bold"
                        : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    <span className={meta.color}>{meta.icon}</span>
                    <span className="flex-1 text-left">{meta.label}</span>
                    <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">{cnt}</span>
                  </button>
                );
              })}
            </li>
          );
        })}

        {/* Uncategorized */}
        {uncategorizedRefs.length > 0 && (
          <li>
            <button
              onClick={() => onFilterChange({ type: "uncategorized" })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${
                activeFilter !== null && activeFilter.type === "uncategorized"
                  ? "bg-[#1c1917] text-white shadow-lg shadow-stone-900/10"
                  : "text-stone-500 hover:bg-stone-50 font-medium"
              }`}
            >
              <span className={`flex items-center gap-2 text-sm ${activeFilter !== null && activeFilter.type === "uncategorized" ? "font-bold" : ""}`}>
                <Inbox className="w-4 h-4 shrink-0 opacity-50" />
                Uncategorized
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${activeFilter !== null && activeFilter.type === "uncategorized" ? "bg-stone-700" : "bg-stone-100 text-stone-400"}`}>
                {uncategorizedRefs.length}
              </span>
            </button>
          </li>
        )}
      </ul>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h3 className="font-bold text-stone-400 uppercase tracking-widest text-xs mb-4 px-2">
            Popular Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                onClick={() => onTagClick?.(tag)}
                className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-200 cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

