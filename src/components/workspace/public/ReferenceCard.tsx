"use client";

import { useState } from "react";
import { ExternalLink, Download, Trash2, Edit, FolderInput, Check } from "lucide-react";
import type { WorkspaceFolder } from "@/types";

interface ReferenceCardProps {
  id: string;
  title: string;
  source: string;
  referenceStatus?: "processing" | "ready" | "failed";
  imageUrl: string;
  tags: string[];
  type?: "image" | "link" | "color" | "video";
  colorPalette?: string[];
  folders?: WorkspaceFolder[];
  currentFolderId?: string | null;
  onSave?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onMove?: (folderId: string | null) => void;
  onClick?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export function ReferenceCard({
  id,
  title,
  source,
  referenceStatus,
  imageUrl,
  tags,
  type = "image",
  colorPalette,
  folders = [],
  currentFolderId,
  onSave,
  onOpen,
  onDelete,
  onEdit,
  onMove,
  onClick,
  canDelete = false,
  canEdit = false,
}: ReferenceCardProps) {
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const renderPreview = () => {
    if (type === "color" && colorPalette) {
      return (
        <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden flex flex-col">
          {colorPalette.map((color, index) => (
            <div
              key={index}
              className="flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave?.();
              }}
              className="px-5 py-2.5 bg-white text-stone-900 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg"
            >
              Copy Hex
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave?.();
            }}
            className="px-5 py-2.5 bg-white text-stone-900 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg"
          >
            Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
            }}
            className="w-10 h-10 bg-white/30 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white hover:text-stone-900 transition-colors"
          >
            {type === "image" ? (
              <Download className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[32px] overflow-hidden group hover:shadow-xl transition-all border border-stone-100 hover-lift relative h-fit ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Action buttons - only visible on hover */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move to folder */}
        {canEdit && onMove && folders.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMoveOpen((p) => !p); }}
              className="w-8 h-8 bg-lime-500 text-white rounded-full flex items-center justify-center hover:bg-lime-600 shadow-lg"
              title="Move to folder"
            >
              <FolderInput className="w-4 h-4" />
            </button>
            {isMoveOpen && (
              <div
                className="absolute right-0 top-10 bg-white rounded-2xl shadow-2xl border border-stone-100 py-2 min-w-44 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">Move to</p>
                {/* No folder option */}
                <button
                  onClick={() => { onMove(null); setIsMoveOpen(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-stone-50 transition-colors ${
                    !currentFolderId ? "font-bold text-stone-900" : "text-stone-600"
                  }`}
                >
                  {!currentFolderId && <Check className="w-3.5 h-3.5 text-lime-500" />}
                  <span className={!currentFolderId ? "" : "pl-5"}>None</span>
                </button>
                {folders.map((f) => (
                  <button
                    key={f.folder_id}
                    onClick={() => { onMove(f.folder_id); setIsMoveOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-stone-50 transition-colors ${
                      currentFolderId === f.folder_id ? "font-bold text-stone-900" : "text-stone-600"
                    }`}
                  >
                    {currentFolderId === f.folder_id && <Check className="w-3.5 h-3.5 text-lime-500 shrink-0" />}
                    <span className={currentFolderId === f.folder_id ? "" : "pl-5"}>{f.folder_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Edit button */}
        {canEdit && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg"
            title="Edit reference"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
        {/* Delete button */}
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
            title="Delete reference"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {renderPreview()}
      <div className="p-5">
        <h3 className="font-bold text-lg text-stone-900 truncate">{title}</h3>
        <p className="text-stone-400 text-sm mb-3">{source}</p>
        {referenceStatus === 'processing' && (
          <p className="text-xs text-slate-400 animate-pulse mb-2">Downloading…</p>
        )}
        {referenceStatus === 'failed' && (
          <p className="text-xs text-amber-400 mb-2">Saved as link</p>
        )}
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-stone-50 text-[10px] font-bold text-stone-500 rounded-md border border-stone-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
