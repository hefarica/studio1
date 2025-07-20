'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Server, ServerStatus } from '@/lib/types';
import { CONFIG } from '@/lib/constants';

interface ServersState {
  servers: Server[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  cacheSize: number; // Added cacheSize to the state
  actions: {
    loadInitialServers: () => void;
    addServer: (serverData: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => void;
    deleteServer: (serverId: string) => void;
    updateServer: (serverId: string, updates: Partial<Server>) => void;
    clearServers: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    calculateCacheSize: () => void;
  };
}

const initialServers: Server[] = [
  {
    id: '1',
    name: 'EVESTV IP TV',
    url: 'http://126954339934.d4ktv.info:80',
    status: 'Online',
    activeChannels: 0,
    user: 'uqb3fbu3b',
    password: 'Password123',
    lastScan: 'Never',
  },
];

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      loading: false,
      error: null,
      lastUpdated: null,
      cacheSize: 0,
      actions: {
        loadInitialServers: () => {
            if (get().servers.length === 0) {
                set({
                    servers: initialServers,
                });
            }
            get().actions.calculateCacheSize();
        },
        addServer: (serverData) => {
          if (!serverData.name?.trim()) throw new Error('El nombre del servidor es requerido');
          if (!serverData.url?.trim()) throw new Error('La URL del servidor es requerida');
          if (!CONFIG.VALIDATION.URL_REGEX.test(serverData.url)) throw new Error('La URL debe comenzar con http:// o https://');
          if (!serverData.user?.trim()) throw new Error('El usuario es requerido');
          if (!serverData.password?.trim()) throw new Error('La contraseña es requerida');

          const existingServer = get().servers.find(s => s.url === serverData.url && s.user === serverData.user);
          if (existingServer) throw new Error('Este servidor ya está configurado');

          const newServer: Server = {
            ...serverData,
            id: `server_${Date.now()}`,
            status: 'Online',
            activeChannels: 0,
            lastScan: 'Never',
          };
          set((state) => ({ 
              servers: [...state.servers, newServer],
              lastUpdated: new Date().toISOString(),
           }));
           get().actions.calculateCacheSize();
        },
        deleteServer: (serverId) => {
          set((state) => ({
            servers: state.servers.filter((s) => s.id !== serverId),
            lastUpdated: new Date().toISOString(),
          }));
          get().actions.calculateCacheSize();
        },
        updateServer: (serverId, updates) => {
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === serverId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
            ),
            lastUpdated: new Date().toISOString(),
          }));
          get().actions.calculateCacheSize();
        },
        clearServers: () => {
          set({ servers: [], lastUpdated: new Date().toISOString() });
          get().actions.calculateCacheSize();
        },
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        calculateCacheSize: () => {
            try {
                const servers = get().servers;
                const sizeInBytes = new TextEncoder().encode(JSON.stringify(servers)).length;
                const sizeInMB = sizeInBytes / (1024 * 1024);
                set({ cacheSize: sizeInMB });
            } catch (e) {
                set({ cacheSize: 0 });
            }
        }
      },
    }),
    {
      name: CONFIG.STORAGE_PREFIX + 'servers',
      version: 2,
      partialize: (state) => ({ servers: state.servers }),
       onRehydrateStorage: () => (state) => {
        state?.actions.calculateCacheSize();
      },
    }
  )
);

// Initial load
if (typeof window !== 'undefined') {
    useServersStore.getState().actions.loadInitialServers();
}