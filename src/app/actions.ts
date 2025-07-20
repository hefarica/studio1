'use server'

import { optimizeScanConfiguration, OptimizeScanConfigurationInput, OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';
import { analyzeStreamData, AnalyzeStreamDataInput, AnalyzeStreamDataOutput } from '@/ai/flows/analyze-stream-data';

export async function getAiOptimization(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  try {
    const result = await optimizeScanConfiguration(input);
    return result;
  } catch (error) {
    console.error('Error getting AI optimization:', error);
    throw new Error('Failed to get AI optimization suggestions.');
  }
}

export async function getStreamAnalysis(input: AnalyzeStreamDataInput): Promise<AnalyzeStreamDataOutput> {
  try {
    const result = await analyzeStreamData(input);
    return result;
  } catch (error) {
    console.error('Error getting stream analysis:', error);
    throw new Error('Failed to get stream analysis.');
  }
}
