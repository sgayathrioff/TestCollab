"use client";

import { useState } from "react";
import { X, FolderPlus } from "lucide-react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateFolderModal({ isOpen, onClose, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setName("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      <div className="relative z-10 bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-100 rounded-2xl flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-lime-700" />
            </div>
            <h2 className="text-xl font-bold text-stone-900">New Folder</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="e.g. Design Elements"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-medium text-stone-900"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={loading || !name.trim()}
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-[#1c1917] text-white font-bold hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Folder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
