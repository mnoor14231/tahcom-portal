import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CheckCheck, Bell, Clock, AlertCircle, CheckCircle, XCircle, Target } from 'lucide-react';
import type { Notification, NotificationType } from '../../types.ts';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onRemoveNotification: (notificationId: string) => void;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onRemoveNotification
}: NotificationPanelProps) {
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return <Target size={16} className="text-blue-600" />;
      case 'task_due_soon':
        return <Clock size={16} className="text-amber-600" />;
      case 'task_overdue':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'task_approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'task_rejected':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned':
        return 'border-l-blue-500 bg-blue-50';
      case 'task_due_soon':
        return 'border-l-amber-500 bg-amber-50';
      case 'task_overdue':
        return 'border-l-red-500 bg-red-50';
      case 'task_approved':
        return 'border-l-green-500 bg-green-50';
      case 'task_rejected':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={20} className="text-brand-1" />
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllAsRead}
                      className="px-3 py-1 text-xs font-semibold text-brand-1 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.isRead ? 'bg-white' : 'bg-gray-50/50'
                      } hover:bg-gray-50 transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">
                                  {formatTime(notification.timestamp)}
                                </span>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                  title="Mark as read"
                                >
                                  <Check size={14} className="text-gray-500" />
                                </button>
                              )}
                              <button
                                onClick={() => onRemoveNotification(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                                title="Remove notification"
                              >
                                <X size={14} className="text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
