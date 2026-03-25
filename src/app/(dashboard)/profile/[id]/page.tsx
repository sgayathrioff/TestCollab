"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BadgeCheck,
  Globe,
  Twitter,
  Linkedin,
  Link,
  LayoutGrid,
  Star,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useFollow } from "@/hooks/useFollow";
import { WorkspaceCard } from "@/components/explore";
import { EditProfileModal } from "@/components/profile/EditProfileModal";

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
  twitter_url: string;
  linkedin_url: string;
  is_verified: boolean;
  skills: string[];
  custom_links: CustomLink[];
}

interface ProfileStats {
  spacesCount: number;
  followersCount: number;
  refsSavedCount: number;
}

interface PublicWorkspace {
  workspace_id: string;
  workspace_title: string;
  workspace_description: string;
  workspace_cover_image: string | null;
  workspace_category: string | null;
  workspace_likes: number;
  workspace_created_at: string;
}

// Mock data for initial display
const mockProfile: ProfileData = {
  id: "mock-1",
  display_name: "Sarah Jenks",
  username: "sarahj",
  bio: "Obsessed with clean interfaces, typography, and organic shapes. I use Collabio to organize all my moodboards and design systems. Feel free to explore my public spaces! ✨",
  avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
  cover_url: "",
  website_url: "https://example.com",
  twitter_url: "",
  linkedin_url: "https://linkedin.com/in/sarahj",
  is_verified: true,
  skills: ["UI/UX Design", "Figma", "Branding"],
  custom_links: [],
};

const mockStats: ProfileStats = {
  spacesCount: 42,
  followersCount: 8400,
  refsSavedCount: 12000,
};

const mockWorkspaces: PublicWorkspace[] = [
  {
    workspace_id: "w1",
    workspace_title: "UI/UX Inspiration 2024",
    workspace_description: "A curated collection of the best landing pages.",
    workspace_cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    workspace_category: "Design",
    workspace_likes: 1200,
    workspace_created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    workspace_id: "w2",
    workspace_title: "Logofolio Vol. 2",
    workspace_description: "References for minimalist logomarks.",
    workspace_cover_image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    workspace_category: "Branding",
    workspace_likes: 843,
    workspace_created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    workspace_id: "w3",
    workspace_title: "iOS App Patterns",
    workspace_description: "Onboarding flows and micro-interactions.",
    workspace_cover_image: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800",
    workspace_category: "Mobile",
    workspace_likes: 512,
    workspace_created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Placeholder images for workspaces without covers
const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
  "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800",
  "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800",
  "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800",
];

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>(mockStats);
  const [workspaces, setWorkspaces] = useState<PublicWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use useFollow hook directly - will automatically check status on mount
  const { isFollowing, toggleFollow, isLoading } = useFollow(profileId || "");
  const [activeTab, setActiveTab] = useState<"workspaces" | "saved">("workspaces");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState<"general" | "bio" | "skills" | "social">("general");

  const openEdit = (tab: "general" | "bio" | "skills" | "social") => {
    setEditTab(tab);
    setIsEditModalOpen(true);
  };

  // Unwrap params
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setProfileId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  // Fetch profile data
  useEffect(() => {
    if (!profileId) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("profile_id", profileId)
          .maybeSingle();

        if (profileError || !profileData) {
          // Use mock data if profile not found
          console.warn("Profile not found, using mock data", profileError);
          setProfile(mockProfile);
          setWorkspaces(mockWorkspaces);
          setStats(mockStats);
        } else {
          setProfile({
            id: profileData.profile_id,
            display_name: profileData.display_name || "Unknown User",
            username: profileData.display_name?.toLowerCase().replace(/\s+/g, '') || "user",
            bio: profileData.profile_bio || "",
            avatar_url: profileData.profile_avatar_url || mockProfile.avatar_url,
            cover_url: profileData.profile_cover_url || "",
            website_url: profileData.profile_website_url || "",
            twitter_url: profileData.profile_twitter_url || "",
            linkedin_url: profileData.profile_linkedin_url || "",
            is_verified: profileData.profile_is_verified || false,
            skills: profileData.profile_skills || [],
            custom_links: (() => {
              const raw = profileData.profile_custom_links;
              if (!raw) return [];
              if (Array.isArray(raw)) return raw;
              try { return JSON.parse(raw); } catch { return []; }
            })(),
          });

          // Fetch public workspaces for this user
          const { data: workspacesData } = await supabase
            .from("workspaces")
            .select("*")
            .eq("workspace_owner_id", profileId)
            .eq("workspace_visibility", "public")
            .order("workspace_created_at", { ascending: false })
            .limit(12);

          if (workspacesData) {
            setWorkspaces(workspacesData);
          }

          // Count total references uploaded by this user
          const { count: refsCount } = await supabase
            .from("references")
            .select("*", { count: "exact", head: true })
            .eq("uploaded_by_profile_id", profileId);

          // Count total followers
          const { count: followersCount } = await supabase
            .from("followers")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profileId);

          // Calculate stats
          const workspacesCount = workspacesData?.length || 0;
          setStats({
            spacesCount: workspacesCount,
            followersCount: followersCount || 0,
            refsSavedCount: refsCount || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setProfile(mockProfile);
        setWorkspaces(mockWorkspaces);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [profileId, refreshTrigger]);

  const handleFollowToggle = async () => {
    await toggleFollow();
    // Optimistically update follow count
    setStats(prev => ({
        ...prev,
        followersCount: isFollowing 
            ? Math.max(0, prev.followersCount - 1) 
            : prev.followersCount + 1
    }));
  };

  const handleRemoveBanner = async () => {
    if (!user?.id || user.id !== profile.id) return;

    const { error } = await supabase
      .from("profiles")
      .update({ profile_cover_url: null })
      .eq("profile_id", user.id);

    if (!error) {
      setProfile((prev) => (prev ? { ...prev, cover_url: "" } : prev));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
    return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? "s" : ""} ago`;
  };

  const getCategoryEmoji = (category: string | null) => {
    const emojiMap: Record<string, string> = {
      Design: "🎨",
      Code: "💻",
      Audio: "🎧",
      Branding: "✨",
      Mobile: "📱",
      Video: "🎬",
      Writing: "📝",
    };
    return emojiMap[category || ""] || "📁";
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Back Button */}
      <button
        onClick={() => user?.id === profile?.id ? router.push(`/dashboard/${user?.id}`) : router.push("/explore")}
        className="flex items-center gap-2 text-stone-500 font-bold hover:text-stone-900 transition-colors mb-6 ml-2"
      >
        <ArrowLeft className="w-4 h-4" /> {user?.id === profile?.id ? "Back to Dashboard" : "Back to Explore"}
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-[48px] p-4 shadow-sm border border-stone-100 mb-12">
        {/* Cover Image */}
        <div className="h-48 md:h-64 w-full rounded-[40px] bg-gradient-to-r from-lime-200 via-emerald-200 to-teal-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
          {profile.cover_url && (
            <Image
              src={profile.cover_url}
              alt="Cover"
              fill
              priority
              className="w-full h-full object-cover"
            />
          )}
          {user?.id === profile.id && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEdit("general")}
                className="px-3 py-1.5 rounded-full bg-white/85 text-stone-800 text-xs font-bold hover:bg-white transition-colors"
              >
                Change Banner
              </button>
              {profile.cover_url && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="px-3 py-1.5 rounded-full bg-white/85 text-red-600 text-xs font-bold hover:bg-white transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Content */}
        <div className="px-8 pb-8 relative">
          {/* Header with Avatar and Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 md:-mt-20 mb-6">
            {/* Avatar and Name */}
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-8 border-white bg-white overflow-hidden shadow-lg relative z-10">
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  width={160}
                  height={160}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Name and Username */}
              <div className="mb-2">
                <h1 className="text-4xl font-bold text-stone-900 flex items-center gap-2">
                  {profile.display_name}
                  {profile.is_verified && (
                    <BadgeCheck className="w-6 h-6 text-lime-600 fill-lime-100" />
                  )}
                  {user?.id === profile.id && (
                    <button 
                      onClick={() => openEdit("general")} 
                      className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors ml-2"
                      title="Edit Profile"
                    >
                      <Pencil className="w-4 h-4 text-stone-600" />
                    </button>
                  )}
                </h1>
                <p className="text-lg text-stone-500 font-medium">
                  @{profile.username}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 relative z-10">
              {user?.id === profile.id ? (
                <button
                  onClick={() => openEdit("social")}
                  className="w-12 h-12 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                  title="Edit Social Links"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleFollowToggle}
                  className={`px-8 py-3 rounded-full font-bold transition-colors text-lg ${
                    isFollowing
                      ? "bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-200"
                      : "bg-[#1c1917] text-white hover:bg-stone-800 shadow-md"
                  }`}
                >
                  {isLoading ? "Updating..." : isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Bio and Stats */}
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            {/* Bio */}
            <div className="max-w-2xl">
              <div className="relative group">
                <p className="text-stone-600 leading-relaxed text-lg mb-4 pr-10">
                  {profile.bio || "No bio yet."}
                </p>
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                      title="Website"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {profile.twitter_url && (
                    <a
                      href={profile.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                      title="Twitter"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {profile.linkedin_url && (
                    <a
                      href={profile.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}

                  {profile.custom_links?.map((customLink, idx) => (
                    <a
                      key={idx}
                      href={customLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3 rounded-full border-2 border-stone-200 flex items-center gap-2 text-stone-600 hover:bg-stone-50 transition-colors text-sm font-medium"
                      title={customLink.label}
                    >
                      <Link className="w-3.5 h-3.5" />
                      {customLink.label}
                    </a>
                  ))}
                </div>
                {user?.id === profile.id && (
                  <button 
                    onClick={() => openEdit("bio")} 
                    className="absolute right-0 top-0 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit Bio"
                  >
                    <Pencil className="w-4 h-4 text-stone-600" />
                  </button>
                )}
              </div>
              
              {/* Skills */}
              {(profile.skills && profile.skills.length > 0 || user?.id === profile.id) && (
                <div className="mt-4 relative group">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400">Skills</h3>
                    {user?.id === profile.id && (
                      <button 
                        onClick={() => openEdit("skills")} 
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit Skills"
                      >
                        <Pencil className="w-3 h-3 text-stone-600" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-lime-100 text-lime-800 rounded-full text-sm font-medium border border-lime-200 hover:bg-lime-200 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                    {profile.skills.length === 0 && user?.id === profile.id && (
                       <span className="text-stone-400 text-sm italic">Add skills...</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 bg-stone-50 px-8 py-4 rounded-3xl border border-stone-100">
              <div className="text-center">
                <h4 className="text-2xl font-bold text-stone-900">
                  {stats.spacesCount}
                </h4>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Spaces
                </p>
              </div>
              <div className="w-px h-10 bg-stone-200"></div>
              <div className="text-center">
                <h4 className="text-2xl font-bold text-stone-900">
                  {formatNumber(stats.followersCount)}
                </h4>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Followers
                </p>
              </div>
              <div className="w-px h-10 bg-stone-200"></div>
              <div className="text-center">
                <h4 className="text-2xl font-bold text-stone-900">
                  {formatNumber(stats.refsSavedCount)}
                </h4>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Refs Saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workspaces Section */}
      <div>
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-stone-200 mb-8 px-2">
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`pb-4 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "workspaces"
                ? "text-stone-900 font-bold border-b-2 border-stone-900"
                : "text-stone-400 hover:text-stone-900"
            }`}
          >
            <LayoutGrid className="w-5 h-5" /> Public Workspaces (
            {workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-4 font-medium flex items-center gap-2 transition-colors ${
              activeTab === "saved"
                ? "text-stone-900 font-bold border-b-2 border-stone-900"
                : "text-stone-400 hover:text-stone-900"
            }`}
          >
            <Star className="w-5 h-5" /> Saved/Starred
          </button>
        </div>

        {/* Workspaces Grid */}
        {activeTab === "workspaces" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace, index) => (
              <WorkspaceCard
                key={workspace.workspace_id}
                id={workspace.workspace_id}
                title={workspace.workspace_title}
                description={workspace.workspace_description || ""}
                coverImage={
                  workspace.workspace_cover_image ||
                  placeholderImages[index % placeholderImages.length]
                }
                category={workspace.workspace_category || "General"}
                categoryEmoji={getCategoryEmoji(workspace.workspace_category)}
                likes={workspace.workspace_likes || 0}
                showAuthor={false}
                updatedAt={formatDate(workspace.workspace_created_at)}
              />
            ))}
          </div>
        )}

        {/* Saved/Starred Tab */}
        {activeTab === "saved" && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-lg">No saved workspaces yet.</p>
          </div>
        )}

        {/* Empty State */}
        {activeTab === "workspaces" && workspaces.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-lg">
              No public workspaces yet.
            </p>
          </div>
        )}
      </div>
      {/* Modal */}
      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
          initialTab={editTab}
        />
      )}
    </div>
  );
}
