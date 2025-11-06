import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Notification, NotificationType } from '../types.ts';
import { useAuth } from './AuthContext.tsx';
import { useData } from './DataContext.tsx';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  removeNotification: (notificationId: string) => void;
  showNotification: (type: NotificationType, title: string, message: string, relatedTaskId?: string, targetUserId?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { state, setState } = useData();
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
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications]
    }));

    // Show popup for task assignment notifications only if it's for the current user
    if (notification.type === 'task_assigned' && notification.userId === user?.id) {
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
  };

  const markAsRead = (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    }));
  };

  const markAllAsRead = () => {
    if (!user?.id) return;
    
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.userId === user.id ? { ...n, isRead: true } : n
      )
    }));
  };

  const removeNotification = (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== notificationId)
    }));
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
  }), [userNotifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, showNotification]);

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
