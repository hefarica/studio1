'use client';

import { create } from 'zustand';
import { ScanProgress, ScanResult } from '@/lib/types';
import { CONFIG } from '@/lib/constants';

interface ScanningState {
  isScanning: boolean;
  scanId: string | null;
  progress: ScanProgress;
  results: ScanResult[];
  abortController: AbortController | null;
  actions: {
    startScan: (serverIds: string[]) => Promise<void>;
    stopScan: () => void;
    updateProgress: (progress: Partial<ScanProgress>) => void;
    addResult: (result: ScanResult) => void;
    clearResults: () => void;
    reset: () => void;
  }
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
  actions: {
    startScan: async (serverIds: string[]) => {
      const { isScanning } = get();
      if (isScanning) throw new Error('Ya hay un escaneo en progreso');
      if (serverIds.length === 0) throw new Error('Debe seleccionar al menos un servidor');

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

      // This is a placeholder for where you would call your backend API.
      // In a real app, you would have a /api/scan endpoint.
      console.log('Scanning would be initiated here via API call.');
      
      // Simulate progress for demonstration
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        if (currentProgress > 100) {
          clearInterval(interval);
          get().actions.stopScan();
        } else {
          get().actions.updateProgress({ percentage: currentProgress });
        }
      }, 1000);
    },
    stopScan: () => {
      get().abortController?.abort();
      set({ isScanning: false, scanId: null, abortController: null });
      console.log('Scan stopped.');
    },
    updateProgress: (progressUpdate) => {
      set(state => ({ progress: { ...state.progress, ...progressUpdate } }));
    },
    addResult: (result) => {
      set(state => ({ results: [...state.results, result] }));
    },
    clearResults: () => {
      set({ results: [] });
    },
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
  },
}));