'use client';

import { Button } from '@/components/ui/button';
import { ScanLine, Trash2 } from 'lucide-react';

type ControlPanelProps = {
  onScanAll: () => void;
  onClearAll: () => void;
};

export function ControlPanel({ onScanAll, onClearAll }: ControlPanelProps) {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button onClick={onScanAll} size="lg" className="h-14 text-lg">
        <ScanLine className="mr-2 h-5 w-5" />
        Escanear Todos los Servidores
      </Button>
      <Button onClick={onClearAll} size="lg" variant="destructive" className="h-14 text-lg bg-destructive hover:bg-destructive/90">
        <Trash2 className="mr-2 h-5 w-5" />
        Limpiar Todos
      </Button>
    </div>
  );
}
