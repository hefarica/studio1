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
    const state = get();
    if (state.isScanning) throw new Error('Ya hay un escaneo en progreso');
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
  },
  stopScan: () => {
    get().abortController?.abort();
    set({ isScanning: false, scanId: null, abortController: null });
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