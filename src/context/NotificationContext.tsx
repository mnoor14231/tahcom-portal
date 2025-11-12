import React, { createContext, useContext, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Notification, NotificationType } from '../types.ts';
import { useAuth } from './AuthContext.tsx';
import { useData } from './DataContext.tsx';
import { supabase } from '../lib/supabaseClient.ts';
import { sendServerPushNotification } from '../utils/pushNotifications.ts';

const SUPABASE_CONFIGURED =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  removeNotification: (notificationId: string) => void;
  showNotification: (type: NotificationType, title: string, message: string, relatedTaskId?: string, targetUserId?: string) => void;
  savePushSubscription: (subscription: PushSubscription) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    state,
    addNotification: persistNotification,
    markNotificationAsRead: markNotificationInState,
    markAllNotificationsAsRead: markAllNotificationsInState,
    removeNotification: removeNotificationFromState,
  } = useData();
  const [showPopup, setShowPopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  // Filter notifications for current user
  const userNotifications = useMemo(() => {
    if (!user?.id) return [];
    return state.notifications.filter(n => n.userId === user.id);
  }, [state.notifications, user?.id]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !n.isRead).length;
  }, [userNotifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification = persistNotification(notification);

    // Show popup for task assignment and KPI reset notifications if it's for the current user
    if ((notification.type === 'task_assigned' || notification.type === 'kpi_reset') && notification.userId === user?.id) {
      setCurrentNotification(newNotification);
      setShowPopup(true);
    }
  };

  const showNotification = (type: NotificationType, title: string, message: string, relatedTaskId?: string, targetUserId?: string) => {
    const recipientId = targetUserId || user?.id;
    if (!recipientId) return;

    addNotification({
      userId: recipientId,
      type,
      title,
      message,
      relatedTaskId,
    });

    if (SUPABASE_CONFIGURED) {
      const targetUrl = relatedTaskId ? `/tasks?task=${relatedTaskId}` : '/dashboard';
      void sendServerPushNotification({
        userId: recipientId,
        title,
        body: message,
        url: targetUrl,
        data: {
          type,
          relatedTaskId,
        }
      });
    }
  };

  const markAsRead = (notificationId: string) => {
    markNotificationInState(notificationId);
  };

  const markAllAsRead = () => {
    if (!user?.id) return;
    
    markAllNotificationsInState(user.id);
  };

  const removeNotification = (notificationId: string) => {
    removeNotificationFromState(notificationId);
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    if (!user?.id || !SUPABASE_CONFIGURED) return;
    if (!(subscription instanceof PushSubscription)) return;

    const payload = subscription.toJSON();
    if (!payload?.endpoint) return;

    await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: payload.endpoint,
        subscription: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      .then(({ error }) => {
        if (error) console.warn('[Supabase] Failed to save push subscription', error);
      });
  };

  // No auto-hide - popups stay until user dismisses them

  const value = useMemo<NotificationContextValue>(() => ({
    notifications: userNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    showNotification,
    savePushSubscription,
  }), [userNotifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, showNotification, savePushSubscription]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {showPopup && currentNotification && (
        <NotificationPopup
          notification={currentNotification}
          onClose={() => {
            setShowPopup(false);
            setCurrentNotification(null);
          }}
          onMarkAsRead={() => {
            markAsRead(currentNotification.id);
            setShowPopup(false);
            setCurrentNotification(null);
          }}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

// Notification Popup Component
interface NotificationPopupProps {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead: () => void;
}

function NotificationPopup({ notification, onClose, onMarkAsRead }: NotificationPopupProps) {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return '📋';
      case 'task_due_soon':
        return '⏰';
      case 'task_overdue':
        return '🚨';
      case 'task_approved':
        return '✅';
      case 'task_rejected':
        return '❌';
      case 'kpi_reset':
        return '🔄';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'from-blue-500 to-blue-600';
      case 'task_due_soon':
        return 'from-amber-500 to-amber-600';
      case 'task_overdue':
        return 'from-red-500 to-red-600';
      case 'task_approved':
        return 'from-green-500 to-green-600';
      case 'task_rejected':
        return 'from-red-500 to-red-600';
      case 'kpi_reset':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <motion.div
        initial={{ opacity: 0, x: 300, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={`bg-gradient-to-r ${getNotificationColor(notification.type)} text-white rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
              <p className="text-xs text-white/90 leading-relaxed">{notification.message}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-white/70">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={onMarkAsRead}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    OK
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
