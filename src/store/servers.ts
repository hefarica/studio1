import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Server, LogEntry, ServerStatus } from '@/lib/types';

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

const initialLogs: LogEntry[] = [
  { id: 'log_init', timestamp: new Date(), message: '[INFO] System ready to operate.', level: 'info' },
];

interface ServersState {
  servers: Server[];
  logs: LogEntry[];
  isScanning: boolean;
  scanProgress: number;
  eta: string;
  totalChannelsFound: number;
  memoryUsage: number;
  cacheSize: number;
  actions: {
    loadInitialServers: () => void;
    addServer: (serverData: Omit<Server, 'id' | 'status' | 'activeChannels' | 'lastScan'>) => void;
    deleteServer: (serverId: string) => void;
    updateServerStatus: (serverId: string, status: ServerStatus) => void;
    setServers: (servers: Server[] | ((current: Server[]) => Server[])) => void;
    clearServers: () => void;
    addLog: (message: string, level: 'info' | 'warning' | 'error' | 'success') => void;
    clearLogs: () => void;
    setIsScanning: (isScanning: boolean) => void;
    setScanProgress: (progress: number) => void;
    setEta: (eta: string) => void;
    setTotalChannelsFound: (count: number | ((current: number) => number)) => void;
  };
}

export const useServersStore = create<ServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      logs: [],
      isScanning: false,
      scanProgress: 0,
      eta: '00:00:00',
      totalChannelsFound: 0,
      memoryUsage: 128,
      cacheSize: 0.0,
      actions: {
        loadInitialServers: () => {
            if (get().servers.length === 0) {
                set({
                    servers: initialServers,
                    logs: initialLogs,
                    totalChannelsFound: initialServers.reduce((acc, s) => acc + s.activeChannels, 0)
                });
            }
        },
        addServer: (serverData) => {
          const newServer: Server = {
            ...serverData,
            id: `server_${Date.now()}`,
            status: 'Online',
            activeChannels: 0,
            lastScan: 'Never',
          };
          set((state) => ({ servers: [...state.servers, newServer] }));
          get().actions.recalculateCacheSize();
        },
        deleteServer: (serverId) => {
          set((state) => {
            const serverToDelete = state.servers.find(s => s.id === serverId);
            const newTotalChannels = state.totalChannelsFound - (serverToDelete?.activeChannels || 0);
            return {
              servers: state.servers.filter((s) => s.id !== serverId),
              totalChannelsFound: newTotalChannels,
            };
          });
          get().actions.recalculateCacheSize();
        },
        updateServerStatus: (serverId, status) => {
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === serverId ? { ...s, status } : s
            ),
          }));
        },
        setServers: (updater) => {
          set((state) => ({
            servers: typeof updater === 'function' ? updater(state.servers) : updater,
          }));
          get().actions.recalculateCacheSize();
        },
        clearServers: () => {
          set({ servers: [], totalChannelsFound: 0, cacheSize: 0.0 });
        },
        addLog: (message, level) => {
          const timestamp = new Date();
          const timeString = `[${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}]`;
          const formattedMessage = `${timeString} ${message}`;
          const newLogId = `log${Date.now()}${Math.random()}`;
          set((state) => ({
            logs: [{ id: newLogId, timestamp, message: formattedMessage, level }, ...state.logs].slice(0, 100),
          }));
        },
        clearLogs: () => {
          set({ logs: [] });
        },
        setIsScanning: (isScanning) => set({ isScanning }),
        setScanProgress: (scanProgress) => set({ scanProgress }),
        setEta: (eta) => set({ eta }),
        setTotalChannelsFound: (updater) => {
            set((state) => ({
              totalChannelsFound: typeof updater === 'function' ? updater(state.totalChannelsFound) : updater,
            }));
        },
        recalculateCacheSize: () => {
            const servers = get().servers;
            const size = JSON.stringify(servers).length / (1024 * 1024);
            set({ cacheSize: size });
        }
      },
    }),
    {
      name: 'iptv-genius-store',
      // partialize allows to persist only a subset of the state
      partialize: (state) => ({ servers: state.servers, logs: state.logs, totalChannelsFound: state.totalChannelsFound }),
    }
  )
);

// We are calling this action outside to initialize the store from localStorage on app load.
useServersStore.getState().actions.loadInitialServers();
