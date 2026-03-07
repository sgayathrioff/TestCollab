"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { CreateWorkspaceModal } from "@/components/dashboard/CreateWorkspaceModal";
import { Plus, Bell, LayoutGrid, FileText, ArrowUpRight, Users, Activity, Upload, FolderPlus, Settings } from "lucide-react";
import Link from "next/link";

export default function UserDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const date = new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setUserId(resolvedParams.id);
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (authLoading || !userId) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user.id !== userId) {
      router.push("/");
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        // Fetch workspaces where user is owner
        const { data: ownedWorkspaces, error: ownedError } = await supabase
          .from("workspaces")
          .select("*")
          .eq("workspace_owner_id", user.id)
          .order("workspace_created_at", { ascending: false });

        if (ownedError) throw ownedError;

        // Fetch workspaces where user is a member (but not owner)
        const { data: memberWorkspaceIds, error: memberError } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("profile_id", user.id);

        if (memberError) {
          console.error("Error fetching member workspaces:", memberError);
          // Continue with owned workspaces only
          setWorkspaces(ownedWorkspaces || []);
          return;
        }

        let memberWorkspaces: any[] = [];
        if (memberWorkspaceIds && memberWorkspaceIds.length > 0) {
          const ids = memberWorkspaceIds.map(m => m.workspace_id);
          const { data: sharedWorkspaces, error: sharedError } = await supabase
            .from("workspaces")
            .select("*")
            .in("workspace_id", ids)
            .neq("workspace_owner_id", user.id)
            .order("workspace_created_at", { ascending: false });

          if (sharedError) {
            console.error("Error fetching shared workspaces:", sharedError);
          } else {
            memberWorkspaces = sharedWorkspaces || [];
          }
        }

        // Combine owned and member workspaces
        const allWorkspaces = [
          ...(ownedWorkspaces || []),
          ...memberWorkspaces,
        ];

        setWorkspaces(allWorkspaces);
      } catch (err) {
        console.error("Error loading workspaces:", err);
      } finally {
        setWorkspacesLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user, userId, authLoading, router]);

  if (authLoading || !userId || workspacesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Placeholder images for workspaces without images
  const placeholderImages = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=800",
    "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800",
  ];

  return (
    <>
      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        setWorkspaces={setWorkspaces}
      />

      {/* Hero Section with Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        {/* Left: Welcome Message */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full w-fit mb-6 shadow-sm border border-stone-100">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{date}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-stone-900 mb-6 leading-[1.1]">
            Create flow,<br />
            <span className="text-stone-300">not friction.</span>
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-14 px-8 rounded-full bg-[#1c1917] text-white text-lg font-medium hover:scale-105 transition-transform duration-300 flex items-center gap-3 shadow-xl shadow-stone-900/20"
            >
              <Plus className="w-5 h-5" />
              New Workspace
            </button>
            <button className="h-14 w-14 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600">
              <Bell className="w-6 h-6" />
            </button>
            <Link
              href="/profile/setup"
              className="h-14 w-14 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 transition-colors text-stone-600 hover:scale-105 duration-300"
            >
              <Settings className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Right: Stats Cards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          {/* Workspaces Count Card */}
          <div className="bg-white p-8 rounded-[40px] flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] min-h-[280px]">
            <div className="flex justify-between items-start">
              <span className="text-stone-400 font-medium text-lg">Workspaces</span>
              <div className="w-10 h-10 rounded-full bg-[#d9f99d] flex items-center justify-center text-[#365314]">
                <LayoutGrid className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-6xl font-medium text-stone-900 mb-2">{workspaces.length}</h2>
              <div className="flex -space-x-3 mt-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-200"></div>
                <div className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-300"></div>
                <div className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-400"></div>
              </div>
            </div>
          </div>

          {/* References & Storage Cards */}
          <div className="flex flex-col gap-4">
            {/* References Card */}
            <div className="bg-[#d9f99d] p-6 rounded-[32px] flex-1 hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center relative overflow-hidden group">
              <FileText className="absolute -right-4 -bottom-4 w-24 h-24 text-[#bef264] rotate-12 group-hover:scale-110 transition-transform" />
              <h3 className="text-4xl font-semibold text-[#1a2e05] relative z-10">1,248</h3>
              <p className="text-[#365314] font-medium relative z-10">References</p>
            </div>

            {/* Storage Card */}
            <div className="bg-[#1c1917] p-6 rounded-[32px] flex-1 hover:scale-[1.02] transition-transform duration-300 flex items-center justify-between text-white">
              <div>
                <p className="text-stone-400 text-sm mb-1">Storage</p>
                <p className="text-2xl font-medium">75%</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-stone-700 border-t-lime-400 animate-spin" style={{ animationDuration: '3s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Flows Section */}
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-2xl font-medium text-stone-900">Your Workspaces</h2>
        <span className="text-sm font-bold text-stone-400 uppercase tracking-widest">
          {workspaces.length} Total
        </span>
      </div>

      {/* Workspace Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace, index) => {
          const isOwner = workspace.workspace_owner_id === user?.id;
          return (
          <Link
            key={workspace.workspace_id || `workspace-${index}`}
            href={`/workspace/${workspace.workspace_id}`}
            className="group bg-white p-3 pb-6 rounded-[40px] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer"
          >
            <div className="aspect-[4/3] rounded-[32px] overflow-hidden relative mb-5">
              <img
                src={workspace.workspace_cover_image || placeholderImages[index % placeholderImages.length]}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={workspace.workspace_title}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              <button className="absolute top-4 right-4 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black">
                <ArrowUpRight className="w-5 h-5" />
              </button>
              {/* Owner/Member Badge */}
              <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${isOwner ? 'bg-lime-500/80 text-white' : 'bg-white/80 text-stone-700'}`}>
                {isOwner ? 'Owner' : 'Shared'}
              </span>
            </div>
            <div className="px-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-medium text-stone-900">{workspace.workspace_title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${workspace.workspace_visibility === 'public' ? 'bg-lime-100 text-lime-700' : 'bg-stone-100 text-stone-500'}`}>
                  {workspace.workspace_visibility === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
              <p className="text-stone-400 text-sm mb-4">
                {workspace.workspace_description || 'No description'}
              </p>
              <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
                <Users className="w-4 h-4" />
                <span>1 Member</span>
              </div>
            </div>
          </Link>
          );
        })}

        {/* Live Feed Card */}
        <div className="bg-stone-200/50 p-6 rounded-[40px] flex flex-col">
          <div className="flex items-center gap-2 mb-6 text-stone-500">
            <Activity className="w-5 h-5" />
            <span className="font-bold uppercase tracking-widest text-xs">Live Feed</span>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-stone-900 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <span className="font-bold">{user?.display_name?.[0] || 'U'}</span>
              </div>
              <div>
                <p className="text-stone-900 leading-tight mb-1">
                  <span className="font-semibold">You</span> created a new workspace
                </p>
                <p className="text-xs text-stone-500">Just now</p>
              </div>
            </div>
            <div className="flex gap-4 items-start group">
              <div className="w-10 h-10 rounded-full bg-[#1c1917] flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-stone-900 leading-tight mb-1">
                  <span className="font-semibold">System</span> backup completed
                </p>
                <p className="text-xs text-stone-500">1h ago</p>
              </div>
            </div>
          </div>

          <button className="mt-4 w-full py-3 rounded-2xl bg-white text-sm font-bold text-stone-900 shadow-sm hover:bg-stone-50 transition-colors">
            View All Activity
          </button>
        </div>
      </div>

      {/* Empty State / CTA Section */}
      {workspaces.length === 0 && (
        <div className="mt-12 bg-white rounded-[48px] p-12 text-center border border-dashed border-stone-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lime-300 via-green-400 to-emerald-500"></div>

          <div className="inline-flex justify-center items-center w-20 h-20 bg-stone-50 rounded-full mb-6 text-stone-300">
            <FolderPlus className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-medium text-stone-900 mb-2">No workspaces yet</h3>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">Create your first workspace to start organizing your references in a flow state.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 rounded-full border-2 border-stone-900 text-stone-900 font-bold hover:bg-stone-900 hover:text-white transition-all duration-300"
          >
            Create Workspace
          </button>
        </div>
      )}

      {/* Bottom CTA */}
      {workspaces.length > 0 && (
        <div className="mt-12 bg-white rounded-[48px] p-12 text-center border border-dashed border-stone-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-lime-300 via-green-400 to-emerald-500"></div>

          <div className="inline-flex justify-center items-center w-20 h-20 bg-stone-50 rounded-full mb-6 text-stone-300">
            <FolderPlus className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-medium text-stone-900 mb-2">Looking for something else?</h3>
          <p className="text-stone-500 mb-8 max-w-md mx-auto">Create a new workspace to start organizing your references in a flow state.</p>
          <Link
            href="/explore"
            className="px-8 py-3 rounded-full border-2 border-stone-900 text-stone-900 font-bold hover:bg-stone-900 hover:text-white transition-all duration-300 inline-block"
          >
            Browse Archives
          </Link>
        </div>
      )}
    </>
  );
}