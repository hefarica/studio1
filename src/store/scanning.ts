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
  const { updateProgress, addResult, reset } = useScanningStore.getState();
  const { updateServer } = useServersStore.getState();

  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(`/api/iptv/scan-status?scanId=${scanId}`);
      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'NOT_FOUND') {
            addLog(`Scan ${scanId} completed.`, 'success');
            clearInterval(intervalId);
            useScanningStore.getState().reset();
        }
        return;
      }
      
      const { data } = await response.json();
      updateProgress(data.progress);
      
      // Update server statuses based on results
      data.results.forEach((result: ScanResult) => {
        const server = useServersStore.getState().servers.find(s => s.id === result.serverId);
        if (server && server.status === 'scanning') {
            updateServer(result.serverId, { 
                status: result.success ? 'completed' : 'error',
                totalChannels: result.channels,
                lastScan: new Date().toLocaleString()
            });
        }
      });

      if (data.isComplete) {
        addLog(`Scan ${scanId} finalized.`, 'success');
        clearInterval(intervalId);
        setTimeout(() => useScanningStore.getState().reset(), 5000); // Keep final results for a bit
      }
    } catch (error) {
      addLog(`Error polling for scan progress: ${(error as Error).message}`, 'error');
      clearInterval(intervalId);
      reset();
    }
  }, 2000); // Poll every 2 seconds

  return intervalId;
};

export const useScanningStore = create<ScanningState>()((set, get) => ({
  ...initialState,
  startScan: async (serverIds: string[]) => {
    const { addLog } = useLogsStore.getState();
    const { updateServer } = useServersStore.getState();

    const state = get();
    if (state.isScanning) {
        addLog('Ya hay un escaneo en progreso.', 'warning');
        throw new Error('Ya hay un escaneo en progreso');
    }
    if (serverIds.length === 0) {
        addLog('Debe seleccionar al menos un servidor para escanear.', 'warning');
        throw new Error('Debe seleccionar al menos un servidor');
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
        const errorData = await response.json().catch(() => ({ error: 'Error iniciando escaneo' }));
        throw new Error(errorData.error);
      }
      
      const result = await response.json();
      set({ scanId: result.scanId });
      addLog(`[${result.scanId}] Escaneo masivo iniciado para ${result.serversCount} servidor(es).`, 'info');

      // Start polling
      const pollingInterval = pollForProgress(result.scanId);
      set({ pollingInterval });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog(`Petición de inicio de escaneo cancelada.`, 'warning');
      } else {
        addLog(`Error al iniciar el escaneo masivo: ${error.message}`, 'error');
        get().reset();
        throw error;
      }
    }
  },
  stopScan: async () => {
    const state = get();
    const { addLog } = useLogsStore.getState();
    if (!state.isScanning || !state.scanId) return;

    addLog(`[${state.scanId}] Solicitando cancelación de escaneo...`, 'warning');
    
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
    }
    
    try {
        await fetch(`/api/iptv/scan-all?scanId=${state.scanId}`, {
            method: 'DELETE',
        });
        state.abortController?.abort();
        addLog(`[${state.scanId}] Escaneo cancelado.`, 'success');
    } catch(err) {
        addLog(`Error al cancelar escaneo: ${(err as Error).message}`, 'error');
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
    // Set all servers that are stuck in "scanning" to "idle"
    useServersStore.getState().servers.forEach(server => {
        if(server.status === 'scanning') {
            useServersStore.getState().updateServer(server.id, { status: 'idle' });
        }
    });
    set({ ...initialState });
  },
}));

export const useScanning = () => useScanningStore();
