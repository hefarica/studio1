import { z } from 'zod';

export const OptimizeScanConfigurationOutputSchema = z.object({
  suggestedFrequency: z
    .string()
    .describe('Suggested frequency for scanning (e.g., "Daily", "Weekly").'),
  serverPrioritization: z
    .array(z.string())
    .describe('Which servers to prioritize in the next scan.'),
  resourceAllocation: z
    .string()
    .describe('How to allocate resources (e.g., "Increase parallel scans for stable servers").'),
  additionalNotes: z
    .string()
    .describe('Any other relevant optimization notes.'),
});

export type OptimizeScanConfigurationOutput = z.infer<
  typeof OptimizeScanConfigurationOutputSchema
>;
