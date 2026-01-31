"use client";

import { useState, useCallback } from "react";

// Notification types for CRUD operations
export type NotificationType = "create" | "update" | "delete" | "error" | "info" | "copy";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

// Icons for different notification types
function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "create":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>
      );
    case "update":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      );
    case "delete":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      );
    case "error":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
    case "copy":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      );
    case "info":
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      );
  }
}

// Get background color based on notification type
function getNotificationStyle(type: NotificationType): string {
  switch (type) {
    case "create":
    case "update":
    case "copy":
      return "bg-emerald-500 text-white"; // Green for Add/Update/Copy
    case "delete":
    case "error":
      return "bg-red-500 text-white"; // Red for Delete/Error
    case "info":
    default:
      return "bg-slate-800 text-white"; // Slate for Info
  }
}

// Notification Container Component
export function NotificationContainer({ 
  notifications, 
  onDismiss 
}: { 
  notifications: Notification[]; 
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 ${getNotificationStyle(notification.type)}`}
        >
          <NotificationIcon type={notification.type} />
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => onDismiss(notification.id)}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// Custom hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = "info") => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Convenience methods for CRUD operations
  const notifyCreate = useCallback((message: string) => {
    showNotification(message, "create");
  }, [showNotification]);

  const notifyUpdate = useCallback((message: string) => {
    showNotification(message, "update");
  }, [showNotification]);

  const notifyDelete = useCallback((message: string) => {
    showNotification(message, "delete");
  }, [showNotification]);

  const notifyError = useCallback((message: string) => {
    showNotification(message, "error");
  }, [showNotification]);

  const notifyInfo = useCallback((message: string) => {
    showNotification(message, "info");
  }, [showNotification]);

  const notifyCopy = useCallback((message: string) => {
    showNotification(message, "copy");
  }, [showNotification]);

  return {
    notifications,
    showNotification,
    dismissNotification,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyError,
    notifyInfo,
    notifyCopy,
  };
}

