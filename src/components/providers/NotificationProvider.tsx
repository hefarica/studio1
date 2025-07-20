
'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options
          duration: 5000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: '400px',
            padding: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          
          // Success
          success: {
            duration: 4000,
            style: {
              border: '1px solid #059669',
              background: '#064e3b',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          
          // Error
          error: {
            duration: 8000,
            style: {
              border: '1px solid #dc2626',
              background: '#7f1d1d',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
          
          // Loading
          loading: {
            duration: Infinity,
            style: {
              border: '1px solid #3b82f6',
              background: '#1e3a8a',
            },
            iconTheme: {
              primary: '#60a5fa',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </>
  );
};
