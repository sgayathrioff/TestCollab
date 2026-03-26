"use client";

import { useState } from "react";
import { X, Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  setWorkspaces: React.Dispatch<React.SetStateAction<any[]>>;
}

export function CreateWorkspaceModal({ isOpen, onClose, setWorkspaces }: CreateWorkspaceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // 1. Insert into Supabase
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          workspace_owner_id: user.id,
          workspace_title: title,
          workspace_description: description,
          workspace_visibility: visibility,
        })
        .select()
        .single();

      if (error) throw error;
      const workspaceId = data.workspace_id;

      // 2. Add owner to workspace_members
      await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        profile_id: user.id,
        member_role: 'owner',
        member_joined_at: new Date().toISOString()
      });

      // 3. Update Parent State
      setWorkspaces((prev) => [data, ...prev]);

      // 3. Reset and Close
      setTitle("");
      setDescription("");
      setVisibility("private");
      onClose();

    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("Error creating workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-white w-full max-w-lg rounded-[32px] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-stone-900">New Workspace</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title Input */}
          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Workspace Name</label>
             <input 
               autoFocus
               type="text" 
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="e.g. Q4 Marketing Campaign"
               className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-bold text-stone-900 text-lg" 
               required
             />
          </div>

          {/* Description Input */}
          <div>
             <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Description</label>
             <textarea 
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="What is this workspace for?"
               rows={3}
               className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all font-medium text-stone-900 resize-none" 
             />
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Visibility</label>
            <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${visibility === "private" ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-600"}`}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${visibility === "public" ? "bg-white shadow-sm text-emerald-700" : "text-stone-400 hover:text-stone-600"}`}
              >
                Public
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
                type="button"
                onClick={onClose} 
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
                Cancel
            </button>
            <button 
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 py-3.5 rounded-xl bg-[#1c1917] text-white font-bold hover:bg-stone-800 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Create Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}