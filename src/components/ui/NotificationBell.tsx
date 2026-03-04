"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { Bell, X } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
} from "./dropdown-menu";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-0 shadow-lg border border-gray-100 mt-2 z-50">
         <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
            {unreadCount > 0 && (
                <button 
                  onClick={(e) => { e.preventDefault(); markAllAsRead(); }} 
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                    Mark all read
                </button>
            )}
         </div>
         <div className="max-h-[60vh] overflow-y-auto bg-white">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No notifications</p>
                    <p className="text-xs text-gray-500 mt-1">We'll let you know when something important happens.</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                        <div 
                          key={notification.notification_id} 
                          className={cn(
                            "relative group px-4 py-3 hover:bg-gray-50 transition-all cursor-default",
                            !notification.notification_is_read && "bg-blue-50/30"
                          )}
                        >
                             <div className="flex gap-3">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm text-gray-700 leading-snug">
                                        {notification.notification_message}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(notification.notification_created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1 items-end shrink-0">
                                    {!notification.notification_is_read && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.notification_id); }} 
                                          className="p-1.5 hover:bg-blue-100 rounded-full text-blue-600 transition-colors" 
                                          title="Mark as read"
                                        >
                                            <span className="w-2 h-2 block bg-blue-600 rounded-full"></span>
                                        </button>
                                    )}
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.notification_id); }} 
                                      className="p-1.5 hover:bg-red-50 rounded-full text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" 
                                      title="Delete"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
