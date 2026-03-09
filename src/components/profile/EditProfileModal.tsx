"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Plus, Loader2, Trash2, Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";

interface CustomLink {
  label: string;
  url: string;
}

interface ProfileData {
  id: string;
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  website_url: string;
  linkedin_url: string;
  is_verified: boolean;
  skills: string[];
  custom_links: CustomLink[];
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData;
  onUpdate: () => void;
  initialTab?: "general" | "bio" | "skills" | "social";
}

const AVATAR_BUCKET = "Link-UpWorkpace"; // Assuming same bucket as setup page
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onUpdate,
  initialTab = "general",
}: EditProfileModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website_url ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(profile.custom_links ?? []);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [skillInput, setSkillInput] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(profile.avatar_url ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>(profile.cover_url ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "bio" | "skills" | "social">(initialTab);

  // Reset state when profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setWebsite(profile.website_url ?? "");
      setLinkedin(profile.linkedin_url ?? "");
      setCustomLinks(profile.custom_links ?? []);
      setNewLinkLabel("");
      setNewLinkUrl("");
      setSkills(profile.skills ?? []);
      setAvatarPreview(profile.avatar_url ?? "");
      setCoverPreview(profile.cover_url ?? "");
      setAvatarFile(null);
      setCoverFile(null);
      setActiveTab(initialTab);
    }
  }, [isOpen, profile, initialTab]);

  if (!isOpen) return null;

  const handleAvatarChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("File must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { showToast("File must be less than 2MB"); return; }
    if (!file.type.startsWith("image/")) { showToast("Please select an image file"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      showToast("Skill already added");
      return;
    }
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Auto-commit any pending new link the user typed but didn't click "+"
    let finalCustomLinks = customLinks;
    const pendingUrl = newLinkUrl.trim();
    if (pendingUrl) {
      const pendingLabel = newLinkLabel.trim();
      finalCustomLinks = [...customLinks, { label: pendingLabel || pendingUrl, url: pendingUrl }];
      setCustomLinks(finalCustomLinks);
      setNewLinkLabel("");
      setNewLinkUrl("");
    }

    setIsSaving(true);

    try {
      let finalAvatarUrl = profile.avatar_url;
      let finalCoverUrl = profile.cover_url;

      // Upload Avatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(fileName, avatarFile, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
        finalAvatarUrl = data.publicUrl;
      }

      // Upload Cover
      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop();
        const fileName = `${user.id}/cover_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(fileName, coverFile, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
        finalCoverUrl = data.publicUrl;
      }

      // Update Database
      const { error, data: updateData } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          profile_bio: bio,
          profile_skills: skills,
          profile_avatar_url: finalAvatarUrl,
          profile_cover_url: finalCoverUrl,
          profile_website_url: website,
          profile_linkedin_url: linkedin,
          profile_custom_links: JSON.stringify(customLinks),
          profile_updated_at: new Date().toISOString(),
        })
        .eq("profile_id", user.id)
        .select();

      console.log("[EditProfileModal] DB update result:", { error, updateData, customLinks });
      if (error) throw error;

      showToast("Profile updated successfully");
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-stone-100 gap-6 overflow-x-auto hide-scrollbar">
          {(["general", "bio", "skills", "social"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 font-medium text-sm capitalize whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-stone-900 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              {tab} Details
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-stone-100">
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 mb-1">Profile Photo</h3>
                    <p className="text-sm text-stone-500 mb-2">Recommended 400x400px</p>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-bold text-stone-900 hover:underline"
                    >
                      Change Photo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                    onChange={(e) => handleAvatarChange(e)} 
                    />
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <h3 className="font-bold text-stone-900 mb-2">Cover Image</h3>
                  <div className="relative group w-full h-32 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                    {coverPreview && <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>
            )}

            {activeTab === "bio" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 h-40 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                  <p className="text-xs text-stone-400 text-right">{bio.length}/500</p>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-4">
                <label className="text-sm font-bold text-stone-700">Skills & Interests</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    placeholder="Add a skill (e.g. UI Design)"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-3 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-600 flex items-center gap-2"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {skills.length === 0 && (
                    <p className="text-sm text-stone-400 italic">No skills added yet.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "social" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Website URL</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">LinkedIn URL</label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                {/* Custom Links */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-stone-700">Custom Links</label>
                  {customLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => {
                          const updated = [...customLinks];
                          updated[idx] = { ...link, label: e.target.value };
                          setCustomLinks(updated);
                        }}
                        className="w-1/3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                        placeholder="Label (e.g. GitHub)"
                      />
                      <input
                        type="text"
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...customLinks];
                          updated[idx] = { ...link, url: e.target.value };
                          setCustomLinks(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                        placeholder="https://github.com/username"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomLinks(customLinks.filter((_, i) => i !== idx))}
                        className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add new link row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const label = newLinkLabel.trim();
                          const url = newLinkUrl.trim();
                          if (!url) { showToast("Please enter a URL"); return; }
                          setCustomLinks([...customLinks, { label: label || url, url }]);
                          setNewLinkLabel("");
                          setNewLinkUrl("");
                        }
                      }}
                      className="w-1/3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      placeholder="Label (e.g. GitHub)"
                    />
                    <input
                      type="text"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const label = newLinkLabel.trim();
                          const url = newLinkUrl.trim();
                          if (!url) { showToast("Please enter a URL"); return; }
                          setCustomLinks([...customLinks, { label: label || url, url }]);
                          setNewLinkLabel("");
                          setNewLinkUrl("");
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900 text-sm"
                      placeholder="https://github.com/username"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const label = newLinkLabel.trim();
                        const url = newLinkUrl.trim();
                        if (!url) { showToast("Please enter a URL"); return; }
                        setCustomLinks([...customLinks, { label: label || url, url }]);
                        setNewLinkLabel("");
                        setNewLinkUrl("");
                      }}
                      className="p-2 bg-stone-900 text-white rounded-xl hover:bg-stone-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-stone-400">Label is optional — URL will be used if left blank. Press Enter or click + to add.</p>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl font-bold bg-[#1c1917] text-white hover:bg-stone-800 transition-colors flex items-center gap-2 disabled:opacity-75"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}