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

async function fetchWithTimeout(resource: string, options: RequestInit & { timeout: number }) {
  const { timeout, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...rest,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}


export async function fetchXtreamCodesData(serverUrl: string, username: string, password?: string) {
    const baseUrl = `${serverUrl}/player_api.php?username=${username}&password=${password ?? ''}`;

    try {
        const categoriesResponse = await fetchWithTimeout(`${baseUrl}&action=get_live_categories`, { timeout: 15000 });
        if (!categoriesResponse.ok) {
            throw new Error(`Failed to fetch categories, status: ${categoriesResponse.status}`);
        }
        const categories = await categoriesResponse.json();

        if (!Array.isArray(categories)) {
            throw new Error('Categories response is not an array.');
        }

        let allStreams: any[] = [];
        for (const category of categories) {
            if (category.category_id === 'all') continue; 
            
            try {
                const streamsResponse = await fetchWithTimeout(`${baseUrl}&action=get_live_streams&category_id=${category.category_id}`, { timeout: 20000 });
                if (streamsResponse.ok) {
                    const streams = await streamsResponse.json();
                    if (Array.isArray(streams)) {
                        allStreams = [...allStreams, ...streams];
                    }
                }
            } catch (e) {
                console.warn(`Could not fetch streams for category ${category.category_name}`, e);
            }
        }
        
        return allStreams;
    } catch (error) {
        console.error('Error fetching Xtream Codes data:', error);
        throw new Error('Failed to fetch Xtream Codes data.');
    }
}