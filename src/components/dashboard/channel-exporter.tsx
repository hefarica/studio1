'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader } from 'lucide-react';

type ChannelExporterProps = {
  channelCount: number;
};

export function ChannelExporter({ channelCount }: ChannelExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (channelCount === 0) {
      // Maybe show a toast notification?
      alert('No hay canales para exportar.');
      return;
    }

    setIsExporting(true);

    // Simulate data fetching and CSV creation
    setTimeout(() => {
      // In a real app, this data would come from state or an API call
      const simulatedData = Array.from({ length: channelCount }, (_, i) => ({
        channel_id: 1000 + i,
        name: `Canal de Ejemplo ${i + 1}`,
        group_title: i % 5 === 0 ? 'Noticias' : 'Entretenimiento',
        tvg_logo: `http://example.com/logo${i + 1}.png`,
        country: 'ES',
        language: 'Español',
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
      if (link.href) {
        URL.revokeObjectURL(link.href);
      }
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'channels_database.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
    }, 1500); // Simulate delay
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Download className="h-5 w-5 text-primary" />
          Exportar Base de Datos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Descarga la base de datos completa de los canales encontrados en formato CSV, compatible con Excel.
        </p>
        <p className="text-lg font-bold text-accent mt-2">
          {channelCount.toLocaleString('es-ES')} canales listos para exportar.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleExport} disabled={isExporting || channelCount === 0}>
          {isExporting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Descargar Archivo CSV
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
