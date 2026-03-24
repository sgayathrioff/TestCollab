"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase"; // <--- NOW USING SUPABASE
import { Card, CardContent } from "@/components/ui/Card";
import { CreateWorkspaceModal } from "@/components/dashboard/CreateWorkspaceModal"; 
import { 
  Plus, Bell, LayoutGrid, FileText, ArrowUpRight, 
  Users
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [workspaces, setWorkspaces] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  const date = new Date().toLocaleDateString("en-US", { weekday: 'short', day: 'numeric', month: 'short' });

  // --- SUPABASE DATA FETCHING ---
  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchWorkspaces = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('*')
          .eq('workspace_owner_id', user.id) // Use the correct column name
          .order('workspace_created_at', { ascending: false });

        if (error) throw error;
        setWorkspaces(data || []);
      } catch (err) {
        console.error("Error loading workspaces:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user?.id, authLoading]);


  return (
    <div className="max-w-350 mx-auto space-y-12">
      
      {/* --- THE MODAL --- */}
      {/* We pass the setWorkspaces function so the modal can update the UI instantly when a new workspace is created */}
      <CreateWorkspaceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        setWorkspaces={setWorkspaces} 
      />

      {/* --- Header Section --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full w-fit mb-6 shadow-sm border border-stone-100">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">{date}</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-medium tracking-tight text-stone-900 mb-6 leading-[1.1]">
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

        {/* --- Stats Section --- */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <Card className="col-span-2 sm:col-span-1 rounded-[40px] border-none shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:scale-[1.02] transition-transform duration-300">
            <CardContent className="p-8 h-full flex flex-col justify-between min-h-70">
              <div className="flex justify-between items-start">
                <span className="text-stone-400 font-medium text-lg">Workspaces</span>
                <div className="w-10 h-10 rounded-full bg-[#d9f99d] flex items-center justify-center text-[#365314]">
                  <LayoutGrid className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h2 className="text-6xl font-medium text-stone-900 mb-2">
                  {loading ? "..." : workspaces.length}
                </h2>
                <div className="flex -space-x-3 mt-4">
                  <div className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-200"></div>
                  <div className="w-10 h-10 rounded-full border-[3px] border-white bg-stone-300"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="col-span-2 sm:col-span-1 flex flex-col gap-4">
            <Card className="flex-1 rounded-4xl border-none bg-[#d9f99d] relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6 h-full flex flex-col justify-center relative z-10">
                <FileText className="absolute -right-4 -bottom-4 w-24 h-24 text-[#bef264] rotate-12 group-hover:scale-110 transition-transform z-0" />
                <h3 className="text-4xl font-semibold text-[#1a2e05] relative z-10">0</h3>
                <p className="text-[#365314] font-medium relative z-10">References</p>
              </CardContent>
            </Card>

            <Card className="flex-1 rounded-4xl border-none bg-[#1c1917] hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6 h-full flex items-center justify-between text-white">
                <div>
                  <p className="text-stone-400 text-sm mb-1">Storage</p>
                  <p className="text-2xl font-medium">0%</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-stone-700 border-t-lime-400 rotate-45"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* --- Recent Flows --- */}
      <div>
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-2xl font-medium text-stone-900">Recent Flows</h2>
          <Link href="/dashboard" className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest">
            View All
          </Link>
        </div>

        {workspaces.length === 0 && !loading ? (
          <div className="text-center py-10 text-stone-400 border-2 border-dashed border-stone-200 rounded-4xl">
            No flows yet. Create one above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Map through Supabase Data */}
            {workspaces.map((ws) => (
            <WorkspaceCard 
              key={ws.workspace_id} // <--- CRITICAL: Must use workspace_id
              id={ws.workspace_id}  // <--- CRITICAL: Must use workspace_id
              title={ws.workspace_title} // <--- CRITICAL: Must use workspace_title
              type={ws.workspace_visibility || "Private"} 
              // Random image for now since we don't have a cover image column yet
              image={`https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`}
              updated={new Date(ws.workspace_created_at).toLocaleDateString()}
            />
          ))}
                      
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPER COMPONENT (UNCHANGED) ---
function WorkspaceCard({ id, title, type, image, updated }: any) {
  return (
    <Link href={`/workspace/${id}`}>
      <div className="group bg-white p-3 pb-6 rounded-[40px] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer border border-transparent hover:border-stone-100 h-full">
        <div className="aspect-4/3 rounded-4xl overflow-hidden relative mb-5">
          <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={title} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black">
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
        <div className="px-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-2xl font-medium text-stone-900 truncate pr-2">{title}</h3>
            <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold uppercase tracking-wider text-stone-500 shrink-0">{type}</span>
          </div>
          <p className="text-stone-400 text-sm mb-4">Created {updated}</p>
        </div>
      </div>
    </Link>
  );
}