"use client";

import { ExternalLink, Pencil, Trash2, X, Tag } from "lucide-react";
import type { ReferenceData } from "@/types";

interface ReferenceDetailsDrawerProps {
  reference: ReferenceData | null;
  isOpen: boolean;
  onClose: () => void;
  onOpen: (url: string) => void;
  onEdit?: (reference: ReferenceData) => void;
  onDelete?: (referenceId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ReferenceDetailsDrawer({
  reference,
  isOpen,
  onClose,
  onOpen,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: ReferenceDetailsDrawerProps) {
  if (!isOpen || !reference) return null;

  return (
    <div className="fixed inset-0 z-60 flex justify-end">
      <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-white border-l border-stone-200 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Reference Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-stone-100 bg-stone-50 aspect-4/3">
            <img
              src={reference.reference_metadata?.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500"}
              alt={reference.reference_title || "Untitled"}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Title</p>
            <h3 className="text-2xl font-bold text-stone-900 wrap-break-word">
              {reference.reference_title || "Untitled"}
            </h3>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">Type</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-stone-100 text-stone-700 uppercase">
              {reference.reference_type || "document"}
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">URL</p>
            <p className="text-sm text-stone-600 break-all leading-relaxed">{reference.reference_url}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {(reference.tags || []).length > 0 ? (
                reference.tags?.map((tag) => (
                  <span
                    key={tag.tag_id}
                    className="px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold"
                  >
                    #{tag.tag_name}
                  </span>
                ))
              ) : (
                <span className="text-sm text-stone-400">No tags</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpen(reference.reference_url)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1917] text-white text-sm font-bold hover:bg-stone-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open
            </button>
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(reference)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(reference.reference_id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
