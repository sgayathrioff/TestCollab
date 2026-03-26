"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { CreateWorkspaceModal } from "@/components/dashboard/CreateWorkspaceModal";
import { Plus, Bell, ArrowUpRight, Users, FolderPlus, Activity, Zap, Inbox } from "lucide-react";
import Link from "next/link";

export default function DashboardClient({
  initialWorkspaces,
  initialActivityLogs,
  initialPendingInvites,
  userId,
  ownedWorkspaceCount,
  userReferencesCount,
}: {
  initialWorkspaces: any[];
  initialActivityLogs: any[];
  initialPendingInvites: any[];
  userId: string;
  ownedWorkspaceCount: number;
  userReferencesCount: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>(initialWorkspaces || []);
  const [pendingInvites] = useState<any[]>(initialPendingInvites || []);

  const date = new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  if (!authLoading && user && user.id !== userId) {
    router.push("/");
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    );
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
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
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white border border-stone-200 rounded-4xl p-6 shadow-sm min-h-80">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-stone-900 text-base font-semibold flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Activity</h3>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">Latest</span>
            </div>
            <div className="space-y-2.5">
              {(initialActivityLogs || []).slice(0, 5).map((log: any) => (
                <div key={log.activity_id} className="rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3">
                  <p className="text-sm font-medium text-stone-800 truncate leading-5">{log.activity_target_title || "Workspace update"}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <p className="text-[11px] text-stone-500 uppercase tracking-wide truncate">{(log.activity_type || "activity").replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-stone-400 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleDateString() : ""}</p>
                  </div>
                </div>
              ))}
              {(initialActivityLogs || []).length === 0 && (
                <p className="text-sm text-stone-500 mt-10 text-center">No recent activity yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white border border-stone-200 rounded-4xl p-6 shadow-sm">
              <h3 className="text-stone-900 text-base font-semibold flex items-center gap-2 mb-4"><Zap className="w-4 h-4" /> Quick Actions</h3>
              <div className="space-y-2.5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full text-left px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  New Workspace
                </button>
                <Link
                  href="/search"
                  className="block px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Search References
                </Link>
                <Link
                  href="/explore"
                  className="block px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Explore Workspaces
                </Link>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-4xl p-6 shadow-sm">
              <h3 className="text-stone-900 text-base font-semibold flex items-center gap-2 mb-4"><Inbox className="w-4 h-4" /> Pending Invites</h3>
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {pendingInvites.slice(0, 6).map((invite) => (
                  <div key={invite.notification_id} className="rounded-2xl bg-stone-50 border border-stone-200 px-4 py-3">
                    <p className="text-sm font-medium text-stone-800 truncate">{invite.recipient_name || "Invitee"}</p>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{invite.workspace_title || "Workspace"}</p>
                    <p className="text-[10px] text-amber-600 uppercase tracking-wider mt-1">Pending</p>
                  </div>
                ))}
                {pendingInvites.length === 0 && (
                  <p className="text-sm text-stone-500 mt-6 text-center">No pending invites.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-2xl font-medium text-stone-900">Your Workspaces</h2>
        <span className="text-sm font-bold text-stone-400 uppercase tracking-widest">
          {workspaces.length} Total
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((workspace, index) => {
          const isOwner = workspace.workspace_owner_id === user?.id;
          return (
          <Link
            key={workspace.workspace_id || `workspace-${index}`}
            href={`/workspace/${workspace.workspace_id}`}
            className="group bg-white p-3 pb-6 rounded-[40px] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer"
          >
            <div className="aspect-4/3 rounded-4xl overflow-hidden relative mb-5">
              <Image
                src={workspace.workspace_cover_image || placeholderImages[index % placeholderImages.length]}
                fill
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt={workspace.workspace_title}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
              <button className="absolute top-4 right-4 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black">
                <ArrowUpRight className="w-5 h-5" />
              </button>
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
      </div>

      {workspaces.length === 0 && (
        <div className="mt-12 bg-white rounded-[48px] p-12 text-center border border-dashed border-stone-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-lime-300 via-green-400 to-emerald-500"></div>

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

      
    </>
  );
}
