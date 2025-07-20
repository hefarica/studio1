'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ChannelExporterProps = {
  channelCount: number;
};

export function ChannelExporter({ channelCount }: ChannelExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    if (channelCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'There are no channels to export.',
      });
      return;
    }

    setIsExporting(true);

    // Simulate data fetching and CSV creation.
    // In a real app, this data would come from a state management solution
    // that stores all the scanned channel data.
    setTimeout(() => {
      try {
        const simulatedData = Array.from({ length: channelCount }, (_, i) => ({
          channel_id: 1000 + i,
          name: `Sample Channel ${i + 1}`,
          group_title: i % 10 === 0 ? 'News' : 'Entertainment',
          tvg_logo: `http://example.com/logo${i + 1}.png`,
          country: 'US',
          language: 'English',
          resolution: '1080p',
          bitrate: '5000kbps',
          source_server: 'EVESTV IP TV',
        }));

        const headers = Object.keys(simulatedData[0]);
        const csvContent = [
          headers.join(','),
          ...simulatedData.map(row =>
            headers.map(header => `"${row[header as keyof typeof row]}"`).join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'iptv_genius_channels.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({
          title: 'Export Successful',
          description: `${channelCount.toLocaleString()} channels have been exported.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Export Error',
          description: 'An unexpected error occurred during export.',
        });
        console.error('Export failed', error);
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="h-5 w-5 text-primary" />
          Export Database
        </CardTitle>
        <CardDescription>Download all found channels to a CSV file.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The complete database of found channels can be downloaded in CSV format, compatible with Excel and other tools.
        </p>
        <p className="text-3xl font-bold text-accent mt-4">
          {channelCount.toLocaleString('en-US')}
           <span className="text-lg font-medium text-muted-foreground ml-2">channels ready</span>
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleExport} disabled={isExporting || channelCount === 0} className="w-full">
          {isExporting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download CSV File
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
