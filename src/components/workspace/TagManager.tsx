"use client";

import { useState, useEffect } from "react";
import { X, Plus, Tag as TagIcon, Palette, Trash2, Edit2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

interface Tag {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  workspace_id: string;
  tag_created_at: string;
}

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onTagsUpdated?: () => void;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

export function TagManager({ isOpen, onClose, workspaceId, onTagsUpdated }: TagManagerProps) {
  const { showToast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchTags();
    }
  }, [isOpen, workspaceId]);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("tag_created_at", { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error("Error fetching tags:", err);
      showToast("Failed to load tags");
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          tag_name: newTagName.trim(),
          tag_color: newTagColor,
          workspace_id: workspaceId,
        })
        .select()
        .single();

      if (error) throw error;

      setTags([data, ...tags]);
      setNewTagName("");
      setNewTagColor(PRESET_COLORS[0]);
      showToast("Tag created successfully");
      onTagsUpdated?.();
    } catch (err: any) {
      console.error("Error creating tag:", err);
      showToast("Failed to create tag");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTag = async (tagId: string) => {
    if (!editName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("tags")
        .update({
          tag_name: editName.trim(),
          tag_color: editColor,
        })
        .eq("tag_id", tagId);

      if (error) throw error;

      setTags(tags.map(tag => 
        tag.tag_id === tagId 
          ? { ...tag, tag_name: editName.trim(), tag_color: editColor }
          : tag
      ));
      setEditingTag(null);
      setEditName("");
      setEditColor("");
      showToast("Tag updated successfully");
      onTagsUpdated?.();
    } catch (err) {
      console.error("Error updating tag:", err);
      showToast("Failed to update tag");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Delete this tag? It will be removed from all references.")) return;

    setLoading(true);
    try {
      // Delete tag (CASCADE will handle reference_tags)
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("tag_id", tagId);

      if (error) throw error;

      setTags(tags.filter(tag => tag.tag_id !== tagId));
      showToast("Tag deleted successfully");
      onTagsUpdated?.();
    } catch (err) {
      console.error("Error deleting tag:", err);
      showToast("Failed to delete tag");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTag(tag.tag_id);
    setEditName(tag.tag_name);
    setEditColor(tag.tag_color);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setEditName("");
    setEditColor("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-lime-100 rounded-2xl flex items-center justify-center">
              <TagIcon className="w-6 h-6 text-lime-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Tag Manager</h2>
              <p className="text-sm text-stone-500">Organize your references with tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors text-stone-400 hover:text-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Create New Tag */}
          <form onSubmit={handleCreateTag} className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
              Create New Tag
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name (e.g., Design, Research, Ideas)"
                  className="w-full px-4 py-3 bg-stone-50 border-2 border-transparent focus:border-stone-900 focus:bg-white rounded-2xl outline-none transition-all font-medium"
                  maxLength={30}
                />
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-14 h-12 rounded-2xl cursor-pointer border-2 border-stone-200 hover:border-stone-300 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newTagName.trim()}
                className="px-6 py-3 bg-[#1c1917] text-white rounded-2xl font-bold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
            
            {/* Color Presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                    newTagColor === color ? "ring-4 ring-stone-300" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </form>

          {/* Existing Tags */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4">
              Existing Tags ({tags.length})
            </h3>
            {tags.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tags yet</p>
                <p className="text-sm">Create your first tag above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.tag_id}
                    className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors group"
                  >
                    {editingTag === tag.tag_id ? (
                      <>
                        {/* Edit Mode */}
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border-2 border-stone-200"
                        />
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border-2 border-stone-900 rounded-xl outline-none font-medium"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateTag(tag.tag_id)}
                          className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-2 bg-stone-300 text-stone-700 rounded-xl hover:bg-stone-400 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* View Mode */}
                        <div
                          className="w-10 h-10 rounded-xl shrink-0"
                          style={{ backgroundColor: tag.tag_color }}
                        />
                        <span className="flex-1 font-medium text-stone-900">
                          {tag.tag_name}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => startEditing(tag)}
                            className="p-2 hover:bg-stone-200 rounded-xl transition-colors text-stone-600 hover:text-stone-900"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.tag_id)}
                            className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-100 bg-stone-50/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
