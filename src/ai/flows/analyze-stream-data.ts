'use server';

/**
 * @fileOverview AI-powered stream data analyzer.
 *
 * - analyzeStreamData - Analyzes a sample of IPTV stream data to identify extractable fields.
 * - AnalyzeStreamDataInput - The input type for the analyzeStreamData function.
 * - AnalyzeStreamDataOutput - The return type for the analyzeStreamData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeStreamDataInputSchema = z.object({
  streamData: z
    .string()
    .describe('Una muestra de los metadatos de un stream IPTV (ej. una línea de un M3U, o un fragmento de respuesta JSON de la API).'),
});
export type AnalyzeStreamDataInput = z.infer<typeof AnalyzeStreamDataInputSchema>;

const FieldSchema = z.object({
    fieldName: z.string().describe('El nombre del campo identificado (ej. "tvg-id", "group-title", "resolution").'),
    exampleValue: z.string().describe('Un valor de ejemplo extraído de la muestra de datos.'),
    description: z.string().describe('Una breve descripción de lo que representa este campo.'),
});

const AnalyzeStreamDataOutputSchema = z.object({
    identifiedFields: z
        .array(FieldSchema)
        .describe('Una lista de todos los campos estructurados que se pueden extraer de los datos proporcionados.'),
    analysisSummary: z
        .string()
        .describe('Un resumen en español explicando el formato de datos detectado y la calidad de los metadatos.'),
    confidenceScore: z
        .number()
        .describe('Un puntaje de confianza (0-100) sobre la fiabilidad de la extracción de estos campos.'),
});
export type AnalyzeStreamDataOutput = z.infer<typeof AnalyzeStreamDataOutputSchema>;

export async function analyzeStreamData(input: AnalyzeStreamDataInput): Promise<AnalyzeStreamDataOutput> {
  return analyzeStreamDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeStreamDataPrompt',
  input: {schema: AnalyzeStreamDataInputSchema},
  output: {schema: AnalyzeStreamDataOutputSchema},
  prompt: `Eres un experto en ingeniería de datos especializado en formatos de IPTV (M3U, Xtream Codes API, etc.). Tu idioma es el español.

Analizarás la siguiente muestra de metadatos de un stream para identificar todos los campos de información que se pueden extraer de manera estructurada.

Muestra de datos del Stream:
\`\`\`
{{{streamData}}}
\`\`\`

Basado en esta muestra:
1.  Identifica cada campo extraíble (como 'tvg-id', 'tvg-logo', 'group-title', nombre del canal, resolución, idioma, país, bitrate, etc.).
2.  Para cada campo, proporciona su nombre, un valor de ejemplo de la muestra y una descripción.
3.  Proporciona un resumen del análisis, indicando el tipo de formato que crees que es.
4.  Asigna un puntaje de confianza sobre qué tan fiable es la extracción de estos datos.

Tu respuesta debe estar completamente en español.`,
});

const analyzeStreamDataFlow = ai.defineFlow(
  {
    name: 'analyzeStreamDataFlow',
    inputSchema: AnalyzeStreamDataInputSchema,
    outputSchema: AnalyzeStreamDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
