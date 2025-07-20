'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { PlusCircle } from 'lucide-react';

type HeaderProps = {
  onAddServer: () => void;
};

export function Header({ onAddServer }: HeaderProps) {
  return (
    <header className="bg-card dark:bg-gray-800/50 border-b shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Icons.Logo className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              IPTV Genius Scanner
            </h1>
          </div>
          <Button onClick={onAddServer}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Server
          </Button>
        </div>
      </div>
    </header>
  );
}
