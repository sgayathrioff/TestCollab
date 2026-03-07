"use client";

import { ExternalLink, Download, Trash2, Edit } from "lucide-react";

interface ReferenceCardProps {
  id: string;
  title: string;
  source: string;
  imageUrl: string;
  tags: string[];
  type?: "image" | "link" | "color" | "video";
  colorPalette?: string[];
  onSave?: () => void;
  onOpen?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

export function ReferenceCard({
  id,
  title,
  source,
  imageUrl,
  tags,
  type = "image",
  colorPalette,
  onSave,
  onOpen,
  onDelete,
  onEdit,
  canDelete = false,
  canEdit = false,
}: ReferenceCardProps) {
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
    <div className="bg-white rounded-[32px] overflow-hidden group hover:shadow-xl transition-all border border-stone-100 hover-lift relative h-fit">
      {/* Action buttons - only visible on hover */}
      <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
