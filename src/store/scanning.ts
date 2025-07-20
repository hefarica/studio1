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
  startScan: (serverIds: string[]) => Promise<void>;
  stopScan: () => void;
  updateProgress: (progress: Partial<ScanProgress>) => void;
  addResult: (result: ScanResult) => void;
  clearResults: () => void;
  reset: () => void;
}

export const useScanningStore = create<ScanningState>()((set, get) => ({
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
    const scanId = `scan_${Date.now()}`;

    set({
      isScanning: true,
      scanId,
      abortController,
      progress: {
        current: 0,
        total: serverIds.length,
        percentage: 0,
        startTime: Date.now(),
        eta: null,
        channelsFound: 0,
      },
      results: [],
    });
    
    serverIds.forEach(id => updateServer(id, { status: 'scanning' }));
    
    try {
      const response = await fetch('/api/iptv/scan-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverIds, scanId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error iniciando escaneo' }));
        throw new Error(errorData.error);
      }
      
      const result = await response.json();
      addLog(`[${scanId}] Escaneo masivo iniciado para ${result.serversCount} servidor(es).`, 'info');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog(`[${scanId}] Petición de inicio de escaneo cancelada.`, 'warning');
      } else {
        addLog(`[${scanId}] Error al iniciar el escaneo masivo: ${error.message}`, 'error');
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
    
    try {
        await fetch(`/api/iptv/scan-all?scanId=${state.scanId}`, {
            method: 'DELETE',
        });
        state.abortController?.abort();
        set({ isScanning: false, scanId: null, abortController: null });
        addLog(`[${state.scanId}] Escaneo cancelado.`, 'success');
    } catch(err) {
        addLog(`Error al cancelar escaneo: ${(err as Error).message}`, 'error');
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
    get().abortController?.abort();
    set({
      isScanning: false,
      scanId: null,
      abortController: null,
      progress: { current: 0, total: 0, percentage: 0, startTime: null, eta: null, channelsFound: 0 },
      results: [],
    });
  },
}));

export const useScanning = () => useScanningStore();
