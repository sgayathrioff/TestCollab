import { create } from 'zustand'

type Notification = {
  notification_id: string
  recipient_profile_id: string
  notification_type: string
  notification_message: string
  notification_link: string | null
  notification_data?: Record<string, any> | null
  notification_is_read: boolean
  notification_created_at: string
}

type NotificationsStore = {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (n: Notification[]) => void
  addNotification: (n: Notification) => void
  removeNotification: (id: string) => void
  markAllRead: () => void
  markRead: (id: string) => void
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.notification_is_read).length,
  }),
  addNotification: (n) => set((state) => ({
    notifications: [n, ...state.notifications],
    unreadCount: state.unreadCount + (n.notification_is_read ? 0 : 1),
  })),
  removeNotification: (id) => set((state) => {
    const target = state.notifications.find(n => n.notification_id === id)
    return {
      notifications: state.notifications.filter(n => n.notification_id !== id),
      unreadCount: state.unreadCount - (target && !target.notification_is_read ? 1 : 0),
    }
  }),
  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, notification_is_read: true })),
    unreadCount: 0,
  })),
  markRead: (id) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.notification_id === id ? { ...n, notification_is_read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
}))
