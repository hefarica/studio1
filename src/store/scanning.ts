'use client';

import { create } from 'zustand';
import { ScanProgress, ScanResult } from '@/lib/types';
import { useServersStore } from './servers';
import { useLogsStore } from './logs';

interface ScanningState {
  isScanning: boolean;
  scanId: string | null;
  progress: ScanProgress;
  results: ScanResult[];
  abortController: AbortController | null;
  pollingInterval: NodeJS.Timeout | null;
  startScan: (serverIds: string[]) => Promise<void>;
  stopScan: () => void;
  updateProgress: (progress: Partial<ScanProgress>) => void;
  addResult: (result: ScanResult) => void;
  clearResults: () => void;
  reset: () => void;
}

const initialState = {
  isScanning: false,
  scanId: null,
  progress: {
    current: 0,
    total: 0,
    percentage: 0,
    startTime: null,
    eta: null,
    channelsFound: 0,
  },
  results: [],
  abortController: null,
  pollingInterval: null,
};

const pollForProgress = (scanId: string) => {
  const { addLog } = useLogsStore.getState();
  const { updateProgress, reset } = useScanningStore.getState();
  const { updateServer, refreshStats } = useServersStore.getState();

  const intervalId = setInterval(async () => {
    try {
      if (!useScanningStore.getState().isScanning) {
        clearInterval(intervalId);
        return;
      }
      
      const response = await fetch(`/api/iptv/scan-status?scanId=${scanId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'NOT_FOUND') {
            addLog(`[${scanId}] Scan finalized.`, 'success');
            clearInterval(intervalId);
            setTimeout(() => {
                reset();
                refreshStats();
            }, 3000);
        }
        return;
      }
      
      const { data } = await response.json();
      updateProgress(data.progress);
      
      // Update server statuses and channel counts based on results
      data.results.forEach((result: ScanResult) => {
        const server = useServersStore.getState().servers.find(s => s.id === result.serverId);
        if (server && (server.status === 'scanning' || server.status === 'idle')) {
            updateServer(result.serverId, { 
                status: result.success ? 'completed' : 'error',
                totalChannels: result.channels,
                lastScan: new Date().toLocaleString()
            });
        }
      });

      if (data.isComplete) {
        addLog(`[${scanId}] Scan complete signal received.`, 'info');
        clearInterval(intervalId);
        setTimeout(() => {
            reset();
            refreshStats(); // Final stats refresh
        }, 5000);
      }
    } catch (error) {
      addLog(`Error polling for scan progress: ${(error as Error).message}`, 'error');
      clearInterval(intervalId);
      reset();
    }
  }, 2000);

  return intervalId;
};

export const useScanningStore = create<ScanningState>()((set, get) => ({
  ...initialState,
  startScan: async (serverIds: string[]) => {
    const { addLog } = useLogsStore.getState();
    const { updateServer } = useServersStore.getState();

    const state = get();
    if (state.isScanning) {
        addLog('A scan is already in progress.', 'warning');
        throw new Error('A scan is already in progress.');
    }
    if (serverIds.length === 0) {
        addLog('At least one server must be selected to scan.', 'warning');
        throw new Error('At least one server must be selected');
    }

    const abortController = new AbortController();
    
    set({
      isScanning: true,
      abortController,
      progress: {
        ...initialState.progress,
        total: serverIds.length,
        startTime: Date.now(),
      },
      results: [],
    });
    
    serverIds.forEach(id => updateServer(id, { status: 'scanning' }));
    
    try {
      const response = await fetch('/api/iptv/scan-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverIds }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error initiating scan' }));
        throw new Error(errorData.error);
      }
      
      const result = await response.json();
      set({ scanId: result.scanId });
      addLog(`[${result.scanId}] Mass scan initiated for ${result.serversCount} server(s).`, 'info');

      // Start polling
      const pollingInterval = pollForProgress(result.scanId);
      set({ pollingInterval });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog(`Scan initiation request cancelled.`, 'warning');
      } else {
        addLog(`Error initiating mass scan: ${error.message}`, 'error');
        get().reset();
        throw error;
      }
    }
  },
  stopScan: async () => {
    const state = get();
    const { addLog } = useLogsStore.getState();
    if (!state.isScanning || !state.scanId) return;

    addLog(`[${state.scanId}] Requesting scan cancellation...`, 'warning');
    
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
    }
    
    try {
        await fetch(`/api/iptv/scan-all?scanId=${state.scanId}`, {
            method: 'DELETE',
        });
        state.abortController?.abort();
        addLog(`[${state.scanId}] Scan cancelled.`, 'success');
    } catch(err) {
        addLog(`Error cancelling scan: ${(err as Error).message}`, 'error');
    } finally {
        get().reset();
    }
  },
  updateProgress: (progressUpdate) => {
    set(state => ({ progress: { ...state.progress, ...progressUpdate } }));
  },
  addResult: (result) => {
    set(state => ({ results: [...state.results, result] }));
  },
  clearResults: () => set({ results: [] }),
  reset: () => {
    const state = get();
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
    }
    
    useServersStore.getState().servers.forEach(server => {
        if(server.status === 'scanning') {
            useServersStore.getState().updateServer(server.id, { status: 'idle' });
        }
    });
    set({ ...initialState });
  },
}));

export const useScanning = () => useScanningStore();
