"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface WorkspaceSettings {
  workspace_id: string;
  workspace_title: string;
  workspace_description: string | null;
  workspace_visibility: "public" | "private";
  workspace_owner_id: string;
  workspace_cover_image: string | null;
}

const STORAGE_BUCKET = "Link-UpWorkpace";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unwrap = async () => {
      const resolved = await params;
      setWorkspaceId(resolved.id);
    };
    unwrap();
  }, [params]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      if (!workspaceId || !user?.id) return;

      const [{ data, error }, { data: ownerMembership }] = await Promise.all([
        supabase
          .from("workspaces")
          .select("workspace_id, workspace_title, workspace_description, workspace_visibility, workspace_owner_id, workspace_cover_image")
          .eq("workspace_id", workspaceId)
          .single(),
        supabase
          .from("workspace_members")
          .select("member_role")
          .eq("workspace_id", workspaceId)
          .eq("profile_id", user.id)
          .eq("member_role", "owner")
          .maybeSingle(),
      ]);

      if (error || !data) {
        setLoading(false);
        return;
      }

      const isOwner = data.workspace_owner_id === user.id || ownerMembership?.member_role === "owner";
      if (!isOwner) {
        router.replace(`/workspace/${workspaceId}`);
        return;
      }

      setWorkspace(data);
      setTitle(data.workspace_title || "");
      setDescription(data.workspace_description || "");
      setVisibility((data.workspace_visibility as "public" | "private") || "private");
      setBannerPreview(data.workspace_cover_image || "");
      setBannerFile(null);
      setBannerRemoved(false);
      setLoading(false);
    };

    if (!authLoading) {
      fetchWorkspace();
    }
  }, [workspaceId, user?.id, authLoading, router]);

  const handleBannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      window.alert("Banner image must be under 2MB.");
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setBannerRemoved(false);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview("");
    setBannerRemoved(true);
  };

  const handleSave = async () => {
    if (!workspaceId || !workspace || !user?.id) return;
    setSaving(true);
    try {
      let finalBannerUrl = workspace.workspace_cover_image;

      if (bannerRemoved) {
        finalBannerUrl = null;
      }

      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop() || "jpg";
        const filePath = `${workspaceId}/banner_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, bannerFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
        finalBannerUrl = data.publicUrl;
      }

      await supabase
        .from("workspaces")
        .update({
          workspace_title: title,
          workspace_description: description,
          workspace_visibility: visibility,
          workspace_cover_image: finalBannerUrl,
        })
        .eq("workspace_id", workspaceId)
        .eq("workspace_owner_id", user.id);

      setWorkspace((prev) => (prev ? { ...prev, workspace_cover_image: finalBannerUrl } : prev));
      setBannerPreview(finalBannerUrl || "");
      setBannerFile(null);
      setBannerRemoved(false);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!workspaceId || !user?.id) return;
    await supabase
      .from("workspaces")
      .update({ is_archived: true })
      .eq("workspace_id", workspaceId)
      .eq("workspace_owner_id", user.id);
    router.push(`/dashboard/${user.id}`);
  };

  const handleDelete = async () => {
    if (!workspaceId || !user?.id) return;
    if (!window.confirm("Delete this workspace permanently?")) return;
    await supabase
      .from("workspaces")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("workspace_owner_id", user.id);
    router.push(`/dashboard/${user.id}`);
  };

  if (loading || authLoading || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-4xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-bold text-stone-900 mb-6">Workspace Settings</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Banner</label>
            <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-stone-200 bg-linear-to-r from-lime-200 via-emerald-200 to-teal-200">
              {bannerPreview && (
                <Image
                  src={bannerPreview}
                  alt="Workspace banner preview"
                  fill
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-white/90 text-stone-800 text-xs font-bold hover:bg-white transition-colors inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {bannerPreview ? "Change" : "Upload"}
                </button>
                {bannerPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="px-3 py-1.5 rounded-full bg-white/90 text-red-600 text-xs font-bold hover:bg-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleBannerChange}
            />
            <p className="mt-2 text-xs text-stone-500">Default is a gradient. Upload, change, or remove at any time.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Workspace title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 bg-white"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 bg-white">
            <span className="text-sm font-semibold text-stone-700">Visibility</span>
            <button
              type="button"
              onClick={() => setVisibility((prev) => (prev === "public" ? "private" : "public"))}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                visibility === "public" ? "bg-lime-100 text-lime-700" : "bg-stone-100 text-stone-500"
              }`}
            >
              {visibility}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#1c1917] text-white font-semibold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-red-200 rounded-4xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-red-700 mb-4">Danger Zone</h2>
        <div className="flex gap-3">
          <button
            onClick={handleArchive}
            className="px-5 py-2.5 rounded-xl bg-amber-100 text-amber-700 font-semibold"
          >
            Archive
          </button>
          <button
            onClick={handleDelete}
            className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}