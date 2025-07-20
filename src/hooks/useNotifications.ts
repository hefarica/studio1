'use client';

import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { CONFIG, NOTIFICATION_TYPES } from '@/lib/constants';
import React from 'react';

type NotificationType = keyof typeof NOTIFICATION_TYPES;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
}

interface NotificationsState {
  notifications: Notification[];
  addNotification: (title: string, message: string, type?: NotificationType, options?: { duration?: number; action?: Notification['action'] }) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  addNotification: (title, message, type = 'INFO', options = {}) => {
    const id = `notification_${Date.now()}`;
    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration: options.duration || CONFIG.NOTIFICATION_DURATION,
      action: options.action,
      createdAt: new Date(),
    };
    set(state => ({ notifications: [...state.notifications, notification] }));

    const toastContent = React.createElement('div', { className: 'flex flex-col gap-1' },
      React.createElement('div', { className: 'font-semibold text-sm' }, title),
      React.createElement('div', { className: 'text-xs opacity-90' }, message),
      notification.action && React.createElement('button', {
        onClick: () => {
          notification.action!.onClick();
          toast.dismiss(id);
        },
        className: 'text-xs underline mt-1 text-left'
      }, notification.action.label)
    );

    const toastOptions = {
      duration: notification.duration,
      id,
      style: {
        borderRadius: '12px',
        border: '1px solid',
        fontSize: '14px',
        maxWidth: '400px',
        background: '#333',
        color: '#fff'
      },
      icon: 'ℹ️'
    };

    switch (type) {
      case 'SUCCESS': toast.success(toastContent, { ...toastOptions, icon: '✅' }); break;
      case 'ERROR': toast.error(toastContent, { ...toastOptions, icon: '❌' }); break;
      case 'WARNING': toast(toastContent, { ...toastOptions, icon: '⚠️' }); break;
      default: toast(toastContent, toastOptions);
    }

    setTimeout(() => get().removeNotification(id), notification.duration);
    return id;
  },
  removeNotification: (id) => {
    set(state => ({ notifications: state.notifications.filter(n => n.id !== id) }));
    toast.dismiss(id);
  },
  clearAllNotifications: () => {
    get().notifications.forEach(n => toast.dismiss(n.id));
    set({ notifications: [] });
  },
}));

export const useNotifications = () => {
  const store = useNotificationsStore();
  return {
    ...store,
    success: (title: string, message: string, options?: any) => store.addNotification(title, message, 'SUCCESS', options),
    error: (title: string, message: string, options?: any) => store.addNotification(title, message, 'ERROR', options),
    warning: (title: string, message: string, options?: any) => store.addNotification(title, message, 'WARNING', options),
    info: (title: string, message: string, options?: any) => store.addNotification(title, message, 'INFO', options),
  };
};