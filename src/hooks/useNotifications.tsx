import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Notification } from '@/types';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_profile_id', user.id)
          .order('notification_created_at', { ascending: false });

        if (error) throw error;

        // Transform data to match Notification interface if necessary
        const formattedData: Notification[] = (data || []).map((item: any) => ({
          ...item
        }));

        setNotifications(formattedData);
        setUnreadCount(formattedData.filter(n => !n.notification_is_read).length); // was is_read
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `recipient_profile_id=eq.${user.id}` 
        }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev]);
            if (!newNotif.notification_is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            setNotifications(prev => {
              const updated = prev.map(n => 
                n.notification_id === updatedNotif.notification_id ? updatedNotif : n
              );
              // Recalculate unread count
              setUnreadCount(updated.filter(n => !n.notification_is_read).length);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => {
              const filtered = prev.filter(n => n.notification_id !== payload.old.notification_id);
              setUnreadCount(filtered.filter(n => !n.notification_is_read).length);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.notification_id === notificationId ? { ...n, notification_is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const { error } = await supabase
        .from('notifications')
        .update({ notification_is_read: true })
        .eq('notification_id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.notification_is_read).map(n => n.notification_id);
      if (unreadIds.length === 0) return;

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, notification_is_read: true })));
      setUnreadCount(0);

      const { error } = await supabase
        .from('notifications')
        .update({ notification_is_read: true })
        .in('notification_id', unreadIds);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllRead = async () => {
    try {
      const readIds = notifications.filter(n => n.notification_is_read).map(n => n.notification_id);
      if (readIds.length === 0) return;

      // Optimistic update
      setNotifications(prev => prev.filter(n => !n.notification_is_read));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('notification_id', readIds);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllRead };
}
