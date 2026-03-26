import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Notification } from '@/types';
import { useNotificationsStore } from '@/lib/stores/notificationsStore';

export function useNotifications() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    setNotifications,
    addNotification,
    removeNotification,
    markRead,
    markAllRead,
  } = useNotificationsStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      const isAbortLikeError = (message: string) =>
        message.includes('AbortError') ||
        message.includes('signal is aborted') ||
        message.includes('aborted without reason');

      const isTransientNetworkError = (message: string) =>
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('networkerror') ||
        message.toLowerCase().includes('err_insufficient_resources');

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_profile_id', user.id)
          .order('notification_created_at', { ascending: false });

        if (error) {
          const message = error.message || 'Unknown notifications fetch error';
          if (isAbortLikeError(message) || isTransientNetworkError(message)) {
            return;
          }
          setNotifications([]);
          console.error('Error fetching notifications:', message);
          return;
        }

        // Transform data to match Notification interface if necessary
        const formattedData: Notification[] = (data || []).map((item: any) => ({
          ...item
        }));

        setNotifications(formattedData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown notifications fetch error';
        if (isAbortLikeError(message) || isTransientNetworkError(message)) {
          return;
        }
        setNotifications([]);
        console.error('Error fetching notifications:', message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    let channel = supabase
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
            addNotification(newNotif);
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            const current = useNotificationsStore.getState().notifications;
            setNotifications(
              current.map((n) =>
                n.notification_id === updatedNotif.notification_id ? updatedNotif : n
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const current = useNotificationsStore.getState().notifications;
            setNotifications(
              current.filter((n) => n.notification_id !== payload.old.notification_id)
            );
          }
        }
      )
      .subscribe();

    // FIX 4: Reconnect the notifications channel when the tab regains focus.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (channel.state === 'closed' || channel.state === 'errored') {
        supabase.removeChannel(channel);
        channel = supabase
          .channel(`user-notifications-${user.id}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `recipient_profile_id=eq.${user.id}` },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                addNotification(payload.new as Notification);
              } else if (payload.eventType === 'UPDATE') {
                const current = useNotificationsStore.getState().notifications;
                setNotifications(current.map((n) =>
                  n.notification_id === (payload.new as Notification).notification_id
                    ? (payload.new as Notification) : n
                ));
              } else if (payload.eventType === 'DELETE') {
                const current = useNotificationsStore.getState().notifications;
                setNotifications(current.filter((n) => n.notification_id !== payload.old.notification_id));
              }
            }
          )
          .subscribe();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, addNotification, setNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistic update
      markRead(notificationId);

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
      markAllRead();

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
      const current = useNotificationsStore.getState().notifications;
      setNotifications(current.filter(n => n.notification_id !== notificationId));
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
      const current = useNotificationsStore.getState().notifications;
      setNotifications(current.filter(n => !n.notification_is_read));

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('notification_id', readIds);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAllRead, removeNotification };
}
