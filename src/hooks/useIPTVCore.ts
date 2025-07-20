'use client';

import { useState, useEffect } from 'react';
import { IPTVCore } from '@/lib/iptv-core';
import { useLogsStore } from '@/store/logs';

export const useIPTVCore = () => {
  const [iptvCore, setIPTVCore] = useState<IPTVCore | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { addLog } = useLogsStore();

  useEffect(() => {
    try {
      addLog('🔧 Iniciando IPTVCore...', 'info');
      
      const core = new IPTVCore();
      
      // Verificar que todos los métodos existen
      const requiredMethods: (keyof IPTVCore)[] = ['scanServer', 'testServerConnection', 'makeRequest', 'getCategories'];
      const missingMethods = requiredMethods.filter(method => typeof core[method] !== 'function');
      
      if (missingMethods.length > 0) {
        throw new Error(`Métodos faltantes en IPTVCore: ${missingMethods.join(', ')}`);
      }
      
      setIPTVCore(core);
      setIsReady(true);
      addLog('✅ IPTVCore listo con todos los métodos', 'success');
      
    } catch (error: any) {
      addLog(`❌ Error inicializando IPTVCore: ${error.message}`, 'error');
      setIsReady(false);
    }
  }, [addLog]);

  return { iptvCore, isReady };
};
