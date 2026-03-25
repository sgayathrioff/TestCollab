"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { X, Clock, FileText, UserPlus, MessageSquare, Activity, Trash2, Settings, Archive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ReferenceData, WorkspaceMember } from "@/types";
import { formatDistanceToNow } from "date-fns"; // You might not have date-fns, I'll use native Intl

type ActivityType =
  | "reference_added"
  | "member_joined"
  | "comment_added"
  | "deleted_reference"
  | "deleted_workspace"
  | "updated_workspace"
  | "archived_workspace";

interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    avatar: string;
  };
  details: {
    targetName?: string; // Reference title or workspace name
    targetId?: string;   // Reference ID
    content?: string;    // Comment content
  };
}

interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  references: ReferenceData[];
  members: WorkspaceMember[];
}

export function ActivityLogDrawer({
  isOpen,
  onClose,
  workspaceId,
  references,
  members,
}: ActivityLogDrawerProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper to format date
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchAdditionalActivities = async () => {
      setLoading(true);
      try {
        // 1. Convert references to activity items
        // We need author info which 'ReferenceData' might have as 'uploaded_by_profile_id'
        // But we need the profile details. 'members' has profile details!
        
        const memberMap = new Map<string, { name: string; avatar: string }>();
        members.forEach(m => {
          if (m.profile) {
            memberMap.set(m.profile_id, {
              name: m.profile.display_name,
              avatar: m.profile.profile_avatar_url
            });
          }
        });

        const referenceActivities: ActivityItem[] = references.map(ref => ({
          id: `ref-${ref.reference_id}`,
          type: "reference_added",
          timestamp: ref.reference_created_at,
          actor: {
            id: ref.uploaded_by_profile_id,
            name: memberMap.get(ref.uploaded_by_profile_id)?.name || "Unknown User",
            avatar: memberMap.get(ref.uploaded_by_profile_id)?.avatar || ""
          },
          details: {
            targetName: ref.reference_title || "Untitled Reference",
            targetId: ref.reference_id
          }
        }));

        // 2. Convert members joining to activity items
        const memberActivities: ActivityItem[] = members.map(m => ({
          id: `mem-${m.profile_id}-${m.member_joined_at}`,
          type: "member_joined",
          timestamp: m.member_joined_at,
          actor: {
            id: m.profile_id,
            name: m.profile?.display_name || "Unknown User",
            avatar: m.profile?.profile_avatar_url || ""
          },
          details: {}
        }));

        // 3. Fetch persisted activity logs (delete/update/archive actions are stored here)
        const { data: activityRows } = await supabase
          .from("activity_logs")
          .select("activity_id, activity_type, activity_target_title, activity_created_at, actor_profile_id")
          .eq("workspace_id", workspaceId)
          .order("activity_created_at", { ascending: false })
          .limit(100);

        const logActivities: ActivityItem[] = (activityRows || [])
          .filter((row: any) => !!row?.activity_type && !!row?.activity_created_at)
          .map((row: any) => ({
            id: `log-${row.activity_id}`,
            type: row.activity_type as ActivityType,
            timestamp: row.activity_created_at,
            actor: {
              id: row.actor_profile_id,
              name: memberMap.get(row.actor_profile_id)?.name || "Unknown User",
              avatar: memberMap.get(row.actor_profile_id)?.avatar || "",
            },
            details: {
              targetName: row.activity_target_title || undefined,
            },
          }));

        // 4. Fetch comments for these references
        // We only fetch if there are references
        let commentActivities: ActivityItem[] = [];
        if (references.length > 0) {
          const refIds = references.map(r => r.reference_id);
          
          // Try fetching from reference_comments
          const { data: comments, error } = await supabase
            .from('reference_comments')
            .select(`
              comment_id,
              content,
              created_at,
              profile_id,
              reference_id
            `)
            .in('reference_id', refIds)
            .order('created_at', { ascending: false })
            .limit(50);

          if (!error && comments) {
             // We need to fetch profiles for commenters if they are not in members list (unlikely but possible)
             // For now assume they are in members or we use placeholder
             commentActivities = comments.map((c: any) => {
               const ref = references.find(r => r.reference_id === c.reference_id);
               return {
                 id: `com-${c.comment_id}`,
                 type: "comment_added",
                 timestamp: c.created_at,
                 actor: {
                   id: c.profile_id,
                   name: memberMap.get(c.profile_id)?.name || "Unknown User",
                   avatar: memberMap.get(c.profile_id)?.avatar || ""
                 },
                 details: {
                   content: c.content,
                   targetName: ref?.reference_title || "Unknown Reference",
                   targetId: c.reference_id
                 }
               };
             });
          }
        }

        // Combine and sort
        const allActivities = [...logActivities, ...referenceActivities, ...memberActivities, ...commentActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setActivities(allActivities);

      } catch (err) {
        console.error("Failed to load activity log", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdditionalActivities();
  }, [isOpen, references, members, workspaceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div 
        className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose} 
      />
      <aside className="relative w-full max-w-sm h-full bg-white shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300 border-l border-stone-100">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-stone-900" />
            <h2 className="text-lg font-bold text-stone-900">Activity Log</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-10 gap-3">
               <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
               <p className="text-xs text-stone-400 font-medium">Syncing activity...</p>
             </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium">No activity yet</p>
              <p className="text-xs text-stone-400 mt-1">Actions taken in this workspace will appear here</p>
            </div>
          ) : (
            <div className="relative pl-4 pr-2 py-4 space-y-8">
                {/* Timeline line */}
              <div className="absolute left-6.75 top-6 bottom-6 w-px bg-stone-100" />

                {activities.map((item) => (
                  <div key={item.id} className="relative flex gap-4 group">
                    <div className="relative z-10 shrink-0">
                      <div className="w-6 h-6 rounded-full ring-4 ring-white relative">
                         <Image
                           src={item.actor.avatar || "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100"} 
                           alt={item.actor.name}
                           width={24}
                           height={24}
                           loading="lazy"
                           className="w-full h-full rounded-full object-cover bg-stone-100"
                         />
                         <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center bg-white">
                           {item.type === 'reference_added' && <div className="w-full h-full rounded-full bg-lime-100 flex items-center justify-center"><FileText className="w-2 h-2 text-lime-600" /></div>}
                           {item.type === 'member_joined' && <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center"><UserPlus className="w-2 h-2 text-blue-600" /></div>}
                           {item.type === 'comment_added' && <div className="w-full h-full rounded-full bg-amber-100 flex items-center justify-center"><MessageSquare className="w-2 h-2 text-amber-600" /></div>}
                           {item.type === 'deleted_reference' && <div className="w-full h-full rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-2 h-2 text-red-600" /></div>}
                           {item.type === 'deleted_workspace' && <div className="w-full h-full rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-2 h-2 text-red-700" /></div>}
                           {item.type === 'updated_workspace' && <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center"><Settings className="w-2 h-2 text-indigo-600" /></div>}
                           {item.type === 'archived_workspace' && <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center"><Archive className="w-2 h-2 text-orange-600" /></div>}
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <span className="text-sm font-bold text-stone-900 truncate">{item.actor.name}</span>
                        <span className="text-[10px] text-stone-400 shrink-0">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                      
                      {item.type === 'reference_added' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          added <span className="font-semibold text-stone-700">"{item.details.targetName}"</span> to the workspace
                        </p>
                      )}
                      
                      {item.type === 'member_joined' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          joined the team
                        </p>
                      )}
                      
                      {item.type === 'comment_added' && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-stone-500 leading-relaxed">
                            commented on <span className="font-semibold text-stone-700">"{item.details.targetName}"</span>
                          </p>
                          <div className="bg-stone-50 rounded-lg p-2 text-xs text-stone-600 border border-stone-100 italic">
                            "{item.details.content}"
                          </div>
                        </div>
                      )}

                      {item.type === 'deleted_reference' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          deleted reference <span className="font-semibold text-stone-700">"{item.details.targetName || "Untitled"}"</span>
                        </p>
                      )}

                      {item.type === 'deleted_workspace' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          deleted workspace <span className="font-semibold text-stone-700">"{item.details.targetName || "Untitled Workspace"}"</span>
                        </p>
                      )}

                      {item.type === 'updated_workspace' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          updated workspace details for <span className="font-semibold text-stone-700">"{item.details.targetName || "Untitled Workspace"}"</span>
                        </p>
                      )}

                      {item.type === 'archived_workspace' && (
                        <p className="text-xs text-stone-500 leading-relaxed">
                          archived workspace <span className="font-semibold text-stone-700">"{item.details.targetName || "Untitled Workspace"}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}