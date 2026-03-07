"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Camera, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

const AVATAR_BUCKET = "Link-UpWorkpace";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const SKILL_SUGGESTIONS = [
  "UI/UX Design",
  "Frontend Development",
  "Backend Development",
  "Product Design",
  "Graphic Design",
  "3D Modeling",
  "Animation",
  "Photography",
  "Video Editing",
  "Content Writing",
  "Marketing",
  "Project Management",
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [existingAvatar, setExistingAvatar] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (!error && profile) {
          setDisplayName(profile.display_name || "");
          setBio(profile.profile_bio || "");
          setSkills(profile.profile_skills || []);
          setExistingAvatar(profile.profile_avatar_url || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadProfile();
    }
  }, [user, authLoading]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast("Avatar must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file");
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
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

    if (!user) {
      showToast("You must be logged in");
      return;
    }

    if (!displayName.trim()) {
      showToast("Please enter a display name");
      return;
    }

    setIsSaving(true);

    try {
      let avatarUrl = existingAvatar;

      // Upload avatar if a new one was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(fileName, avatarFile, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          profile_id: user.id,
          profile_email: user.email,
          display_name: displayName.trim(),
          profile_bio: bio.trim() || null,
          profile_skills: skills,
          profile_avatar_url: avatarUrl || null,
          profile_updated_at: new Date().toISOString(),
        });

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      showToast("Profile updated successfully!");
      
      // Redirect to user's dashboard
      setTimeout(() => {
        router.push(`/dashboard/${user.id}`);
      }, 1000);
    } catch (err: any) {
      showToast(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-stone-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-stone-600">
            Tell us about yourself to get started with Collabio
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-4xl p-8 shadow-lg">
          {/* Avatar Upload */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-stone-900 mb-4">
              Profile Picture
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-stone-100 overflow-hidden flex items-center justify-center">
                  {avatarPreview || existingAvatar ? (
                    <img
                      src={avatarPreview || existingAvatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-stone-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-lime-400 rounded-full flex items-center justify-center text-white hover:bg-lime-500 transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-stone-600 mb-1">
                  Upload a profile picture
                </p>
                <p className="text-xs text-stone-400">
                  JPG, PNG or GIF. Max size 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="mb-6">
            <label
              htmlFor="displayName"
              className="block text-sm font-bold text-stone-900 mb-2"
            >
              Display Name *
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
              placeholder="John Doe"
              required
              disabled={isSaving}
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label
              htmlFor="bio"
              className="block text-sm font-bold text-stone-900 mb-2"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all resize-none"
              placeholder="Tell us about yourself..."
              rows={4}
              disabled={isSaving}
            />
            <p className="text-xs text-stone-400 mt-1">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Skills */}
          <div className="mb-8">
            <label className="block text-sm font-bold text-stone-900 mb-2">
              Skills
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                className="flex-1 px-4 py-2 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all"
                placeholder="Add a skill..."
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-6 py-2 bg-stone-900 text-white rounded-2xl font-medium hover:bg-stone-800 transition-colors"
                disabled={isSaving}
              >
                Add
              </button>
            </div>

            {/* Skill Suggestions */}
            <div className="mb-3">
              <p className="text-xs text-stone-500 mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setSkills([...skills, suggestion]);
                      }}
                      className="px-3 py-1 bg-stone-50 text-stone-600 text-xs rounded-full hover:bg-stone-100 transition-colors"
                      disabled={isSaving}
                    >
                      + {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Selected Skills */}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-lime-100 text-lime-800 text-sm rounded-full flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-lime-900"
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !displayName.trim()}
              className="flex-1 py-3 rounded-2xl bg-linear-to-tr from-lime-400 to-green-500 text-white font-bold hover:shadow-lg hover:shadow-lime-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
