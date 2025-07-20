'use server';

/**
 * @fileOverview AI-powered scan configuration optimizer.
 *
 * - optimizeScanConfiguration - Analyzes scan data and suggests optimal scan settings.
 * - OptimizeScanConfigurationInput - The input type for the optimizeScanConfiguration function.
 * - OptimizeScanConfigurationOutput - The return type for the optimizeScanConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScanConfigurationInputSchema = z.object({
  scanData: z
    .string()
    .describe('Datos históricos de escaneo en formato JSON, incluyendo URLs de servidor, tiempos de escaneo y conteo de canales activos. También incluye la consulta del usuario.'),
  currentConfiguration: z
    .string()
    .describe('La configuración actual de escaneo en formato JSON.'),
});
export type OptimizeScanConfigurationInput = z.infer<typeof OptimizeScanConfigurationInputSchema>;

const OptimizeScanConfigurationOutputSchema = z.object({
  suggestedFrequency: z
    .string()
    .describe('Frecuencia de escaneo sugerida (ej. "Diaria", "Semanal", o una expresión cron personalizada).'),
  serverPrioritization: z
    .array(z.string())
    .describe('Lista de URLs de servidores priorizadas para escanear, basada en la actividad histórica y la consulta del usuario.'),
  resourceAllocation: z
    .string()
    .describe('Sugerencias para la asignación de recursos (ej. memoria o hilos) basada en los datos de escaneo.'),
  additionalNotes: z
    .string()
    .describe('Cualquier nota o recomendación adicional para optimizar el proceso de escaneo. Responde directamente a la consulta del usuario si la hay.'),
});
export type OptimizeScanConfigurationOutput = z.infer<typeof OptimizeScanConfigurationOutputSchema>;

export async function optimizeScanConfiguration(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  return optimizeScanConfigurationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeScanConfigurationPrompt',
  input: {schema: OptimizeScanConfigurationInputSchema},
  output: {schema: OptimizeScanConfigurationOutputSchema},
  prompt: `Eres un administrador de sistemas experto, especializado en optimizar el escaneo de servidores IPTV. Tu idioma es el español.

Analizarás datos de escaneos pasados y la configuración actual para sugerir ajustes óptimos para futuros escaneos. También responderás a la consulta específica del usuario.

Considera la siguiente información:

Datos Históricos y Consulta del Usuario: {{{scanData}}}
Configuración Actual: {{{currentConfiguration}}}

Basado en esta información, proporciona sugerencias en español para:

- Frecuencia Sugerida: ¿Con qué frecuencia se deben escanear los servidores?
- Priorización de Servidores: ¿Qué servidores deberían escanearse primero según la actividad histórica?
- Asignación de Recursos: ¿Cómo deberían asignarse los recursos (memoria, hilos) para un rendimiento óptimo?
- Notas Adicionales: Cualquier otra recomendación para mejorar el proceso, respondiendo directamente a la consulta del usuario si se proporciona.
`,
});

const optimizeScanConfigurationFlow = ai.defineFlow(
  {
    name: 'optimizeScanConfigurationFlow',
    inputSchema: OptimizeScanConfigurationInputSchema,
    outputSchema: OptimizeScanConfigurationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
