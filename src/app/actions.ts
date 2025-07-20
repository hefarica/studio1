'use server'

import { optimizeScanConfiguration, OptimizeScanConfigurationInput, OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';

export async function getAiOptimization(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  try {
    const result = await optimizeScanConfiguration(input);
    return result;
  } catch (error) {
    console.error('Error getting AI optimization:', error);
    throw new Error('Failed to get AI optimization suggestions.');
  }
}
