'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IPTVServer, ServerStatus } from '@/lib/types';
import { CONFIG } from '@/lib/constants';

interface ServersState {
  servers: IPTVServer[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  stats: {
    totalServers: number;
    totalChannels: number;
    connectedServers: number;
    lastScanTime: string | null;
    cacheSize: string;
  };
  addServer: (serverData: Omit<IPTVServer, 'id' | 'channels' | 'lastScan' | 'status' | 'protocol' | 'categories' | 'totalChannels' | 'createdAt' | 'updatedAt'>) => Promise<IPTVServer>;
  removeServer: (serverId: string) => void;
  updateServer: (serverId: string, updates: Partial<IPTVServer>) => void;
  clearAllServers: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStats: () => void;
}

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      loading: false,
      error: null,
      lastUpdated: null,
      stats: {
        totalServers: 0,
        totalChannels: 0,
        connectedServers: 0,
        lastScanTime: null,
        cacheSize: '0 KB',
      },
      addServer: async (serverData) => {
        const state = get();
        if (!serverData.name?.trim()) throw new Error('El nombre del servidor es requerido');
        if (!serverData.url?.trim()) throw new Error('La URL del servidor es requerida');
        if (!CONFIG.VALIDATION.URL_REGEX.test(serverData.url)) throw new Error('La URL debe comenzar con http:// o https://');
        if (!serverData.username?.trim()) throw new Error('El usuario es requerido');
        if (!serverData.password?.trim()) throw new Error('La contraseña es requerida');

        const existingServer = state.servers.find(s => s.url === serverData.url && s.username === serverData.username);
        if (existingServer) throw new Error('Este servidor ya está configurado');

        const newServer: IPTVServer = {
          ...serverData,
          id: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channels: 0,
          lastScan: null,
          status: 'idle' as ServerStatus,
          protocol: null,
          categories: [],
          totalChannels: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => ({
          servers: [...state.servers, newServer],
          lastUpdated: new Date().toISOString(),
          error: null,
        }));
        
        get().refreshStats();
        return newServer;
      },
      removeServer: (serverId) => {
        set(state => ({
          servers: state.servers.filter(s => s.id !== serverId),
          lastUpdated: new Date().toISOString(),
          error: null,
        }));
        get().refreshStats();
      },
      updateServer: (serverId, updates) => {
        set(state => ({
          servers: state.servers.map(server => 
            server.id === serverId 
              ? { ...server, ...updates, updatedAt: new Date() }
              : server
          ),
          lastUpdated: new Date().toISOString(),
        }));
        get().refreshStats();
      },
      clearAllServers: () => {
        set({
          servers: [],
          lastUpdated: new Date().toISOString(),
          error: null,
          stats: {
            totalServers: 0,
            totalChannels: 0,
            connectedServers: 0,
            lastScanTime: null,
            cacheSize: '0 KB',
          }
        });
      },
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      refreshStats: () => {
        const state = get();
        const servers = state.servers;
        const totalChannels = servers.reduce((sum, s) => sum + (s.totalChannels || 0), 0);
        const connectedServers = servers.filter(s => s.status === 'connected').length;
        const lastScanTimes = servers
          .map(s => s.lastScan)
          .filter((s): s is string => s !== null)
          .sort()
          .reverse();
        
        const cacheSize = (() => {
          try {
            const totalSize = JSON.stringify(servers).length;
            const sizeInMB = totalSize / (1024 * 1024);
            return sizeInMB < 1 
              ? `${Math.round(sizeInMB * 1024)} KB`
              : `${sizeInMB.toFixed(1)} MB`;
          } catch {
            return '0 KB';
          }
        })();

        set({
          stats: {
            totalServers: servers.length,
            totalChannels,
            connectedServers,
            lastScanTime: lastScanTimes[0] || null,
            cacheSize,
          }
        });
      },
    }),
    {
      name: CONFIG.STORAGE_PREFIX + 'servers',
      version: 1,
       onRehydrateStorage: () => (state) => {
        if(state) state.refreshStats();
      },
    }
  )
);

export const useServers = () => useServersStore();