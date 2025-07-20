'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader, Search, Lightbulb } from 'lucide-react';
import { getStreamAnalysis } from '@/app/actions';
import type { AnalyzeStreamDataOutput } from '@/ai/flows/analyze-stream-data';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function StreamAnalyzer() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeStreamDataOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);

    try {
      const result = await getStreamAnalysis({ streamData: input });
      setAnalysisResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(errorMessage);
      console.error('Analysis failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card shadow-lg rounded-lg text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Search className="h-5 w-5 text-primary" />
          Analizador de Metadatos de Stream
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleAnalyze}>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pega una muestra de los datos de un stream (ej. una línea de un M3U) para que la IA identifique los campos extraíbles.
          </p>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ej: #EXTINF:-1 tvg-id="Canal1.es" tvg-logo="logo.png" group-title="Noticias",Canal 1`}
            className="flex-1 bg-input text-base font-mono"
            rows={4}
            disabled={isLoading}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Analizar Datos
          </Button>
        </CardFooter>
      </form>
      
      {analysisResult && (
        <CardContent className="mt-4 border-t border-border pt-4">
          <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-base mb-2">Resumen del Análisis</h3>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                    <Lightbulb className="h-5 w-5 text-yellow-400 mt-1" />
                    <p className="text-sm">{analysisResult.analysisSummary}</p>
                </div>
                <div className="mt-2 text-right">
                    <Badge>Confianza: {analysisResult.confidenceScore}%</Badge>
                </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-base mb-2">Campos Identificados</h3>
              <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Campo</TableHead>
                        <TableHead>Ejemplo</TableHead>
                        <TableHead>Descripción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analysisResult.identifiedFields.map((field, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-mono text-primary font-semibold">{field.fieldName}</TableCell>
                            <TableCell className="font-mono">{field.exampleValue}</TableCell>
                            <TableCell className="text-muted-foreground">{field.description}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
            </div>

          </div>
        </CardContent>
      )}

      {error && (
         <CardContent className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-destructive">{error}</p>
         </CardContent>
      )}

    </Card>
  );
}
