"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface EditReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: {
    reference_id: string;
    reference_title: string;
    reference_type: string;
    reference_url: string;
    reference_metadata?: { thumbnail?: string; source?: string };
  };
  onUpdate: (referenceId: string, updates: any) => Promise<void>;
}

export function EditReferenceModal({
  isOpen,
  onClose,
  reference,
  onUpdate,
}: EditReferenceModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(reference.reference_title);
  const [type, setType] = useState(reference.reference_type);
  const [url, setUrl] = useState(reference.reference_url);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset form when reference changes
  useEffect(() => {
    if (isOpen) {
      setTitle(reference.reference_title);
      setType(reference.reference_type);
      setUrl(reference.reference_url);
    }
  }, [isOpen, reference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast("Please provide a title");
      return;
    }

    setIsUpdating(true);

    try {
      const updates = {
        reference_title: title.trim(),
        reference_type: type,
        reference_url: url.trim(),
      };

      console.log('Updating reference with:', updates);

      await onUpdate(reference.reference_id, updates);

      showToast("Reference updated successfully");
      onClose();
    } catch (err: any) {
      console.error('Update error:', err);
      const errorMsg = err?.message || err?.error_description || err?.hint || "Failed to update reference";
      showToast(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-4xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5 text-stone-400" />
        </button>

        <h2 className="text-2xl font-bold text-stone-900 mb-6">
          Edit Reference
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-bold text-stone-900 mb-2"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
              placeholder="Enter reference title"
              disabled={isUpdating}
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-bold text-stone-900 mb-2"
            >
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all bg-white"
              disabled={isUpdating}
            >
              <option value="link">Link</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="color">Color Palette</option>
            </select>
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-bold text-stone-900 mb-2"
            >
              URL
            </label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
              placeholder="https://example.com/resource"
              disabled={isUpdating}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 py-3 rounded-2xl bg-linear-to-tr from-lime-400 to-green-500 text-white font-bold hover:shadow-lg hover:shadow-lime-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </div>
              ) : (
                "Update Reference"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
