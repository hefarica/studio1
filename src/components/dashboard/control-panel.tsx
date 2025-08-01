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
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Button 
        onClick={onScanAll} 
        size="lg" 
        className="h-12 text-base"
        disabled={isScanning}
      >
        {isScanning ? (
          <>
            <Loader className="mr-2 h-5 w-5 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <ScanLine className="mr-2 h-5 w-5" />
            Scan All Servers
          </>
        )}
      </Button>
      <Button 
        onClick={onClearAll} 
        size="lg" 
        variant="destructive" 
        className="h-12 text-base"
        disabled={isScanning}
      >
        <Trash2 className="mr-2 h-5 w-5" />
        Clear All
      </Button>
    </div>
  );
}
