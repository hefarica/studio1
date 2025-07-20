'use client';

import { Button } from '@/components/ui/button';
import { ScanLine, Trash2, Loader } from 'lucide-react';

type ControlPanelProps = {
  onScanAll: () => void;
  onClearAll: () => void;
  isScanning: boolean;
};

export function ControlPanel({ onScanAll, onClearAll, isScanning }: ControlPanelProps) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button 
        onClick={onScanAll} 
        size="lg" 
        className="h-14 text-lg bg-success-color hover:bg-success-color/90 text-white"
        disabled={isScanning}
      >
        {isScanning ? (
          <>
            <Loader className="mr-2 h-5 w-5 animate-spin" />
            Escaneando...
          </>
        ) : (
          <>
            <ScanLine className="mr-2 h-5 w-5" />
            Escanear Todos los Servidores
          </>
        )}
      </Button>
      <Button 
        onClick={onClearAll} 
        size="lg" 
        variant="destructive" 
        className="h-14 text-lg bg-error-color hover:bg-error-color/90 text-white"
        disabled={isScanning}
      >
        <Trash2 className="mr-2 h-5 w-5" />
        Limpiar Todos
      </Button>
    </div>
  );
}
