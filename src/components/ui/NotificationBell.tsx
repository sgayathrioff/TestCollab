"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationsStore } from "@/lib/stores/notificationsStore";
import { Bell, X, UserPlus, UserMinus, FileText, Users, RefreshCw } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
} from "./dropdown-menu";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Notification } from "@/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { useState } from "react";

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const typeConfig: Record<Notification['notification_type'], { icon: React.ReactNode; bg: string; color: string }> = {
  workspace_invite:  { icon: <UserPlus  className="w-4 h-4" />, bg: 'bg-lime-100',  color: 'text-lime-700'  },
  workspace_removal: { icon: <UserMinus className="w-4 h-4" />, bg: 'bg-red-100',   color: 'text-red-600'   },
  reference_added:   { icon: <FileText  className="w-4 h-4" />, bg: 'bg-sky-100',   color: 'text-sky-600'   },
  member_joined:     { icon: <Users     className="w-4 h-4" />, bg: 'bg-purple-100',color: 'text-purple-600'},
  workspace_updated: { icon: <RefreshCw className="w-4 h-4" />, bg: 'bg-amber-100', color: 'text-amber-600' },
};

export function NotificationBell() {
  const { loading, markAsRead, markAllAsRead, deleteNotification, deleteAllRead, removeNotification } = useNotifications();
  const { notifications, unreadCount } = useNotificationsStore();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const handleAcceptInvite = async (notification: Notification) => {
    const workspaceId = notification.notification_data?.workspace_id;
    const workspaceTitle = notification.notification_data?.workspace_title || "workspace";
    if (!user?.id || !workspaceId) return;

    try {
      setProcessingInviteId(notification.notification_id);
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          profile_id: user.id,
          member_role: "viewer",
          member_joined_at: new Date().toISOString(),
        });

      if (memberError && memberError.code !== "23505") throw memberError;

      await supabase
        .from("notifications")
        .delete()
        .eq("notification_id", notification.notification_id);

      removeNotification(notification.notification_id);
      showToast(`You joined ${workspaceTitle}`);
    } catch (err: any) {
      showToast(err?.message || "Failed to accept invite");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    try {
      setProcessingInviteId(notification.notification_id);
      await supabase
        .from("notifications")
        .delete()
        .eq("notification_id", notification.notification_id);

      removeNotification(notification.notification_id);
      showToast("Invite declined");
    } catch (err: any) {
      showToast(err?.message || "Failed to decline invite");
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.notification_is_read) {
      markAsRead(notification.notification_id);
    }
    if (notification.notification_link) {
      router.push(notification.notification_link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-90 p-0 shadow-xl border border-stone-100 rounded-2xl mt-2 z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-stone-900">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-105 overflow-y-auto">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-2 text-stone-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <p className="text-xs">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
              <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-stone-400" />
              </div>
              <p className="text-sm font-semibold text-stone-700">You're all caught up</p>
              <p className="text-xs text-stone-400 mt-1">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {notifications.map((notification) => {
                const config = typeConfig[notification.notification_type] ?? typeConfig.workspace_updated;
                const isInvite = notification.notification_type === "workspace_invite";
                const isClickable = !!notification.notification_link && !isInvite;
                return (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "group flex gap-3 px-4 py-3.5 transition-all",
                      isClickable ? "cursor-pointer hover:bg-stone-50" : "cursor-default hover:bg-stone-50/60",
                      !notification.notification_is_read && "bg-lime-50/40"
                    )}
                  >
                    {/* Type icon */}
                    <div className={cn("mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0", config.bg, config.color)}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug text-stone-700", !notification.notification_is_read && "font-medium text-stone-900")}>
                        {notification.notification_message}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">{timeAgo(notification.notification_created_at)}</p>
                      {isInvite && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvite(notification);
                            }}
                            disabled={processingInviteId === notification.notification_id}
                            className="px-3 py-1.5 rounded-lg bg-lime-600 text-white text-xs font-semibold hover:bg-lime-700 transition-colors"
                          >
                            {processingInviteId === notification.notification_id ? "Processing..." : "Accept"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeclineInvite(notification);
                            }}
                            disabled={processingInviteId === notification.notification_id}
                            className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-300 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {!notification.notification_is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.notification_id); }}
                          title="Mark as read"
                          className="w-2.5 h-2.5 rounded-full bg-lime-500 hover:bg-lime-600 transition-colors mt-1"
                        />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.notification_id); }}
                        title="Dismiss"
                        className="p-1 rounded-full text-stone-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between bg-stone-50/60">
            <span className="text-xs text-stone-400">{notifications.length} total</span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                  className="text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
              {notifications.some(n => n.notification_is_read) && (
                <button
                  onClick={(e) => { e.preventDefault(); deleteAllRead(); }}
                  className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                >
                  Clear read
                </button>
              )}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
