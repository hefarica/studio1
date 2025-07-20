'use server'

import { optimizeScanConfiguration, OptimizeScanConfigurationInput, OptimizeScanConfigurationOutput } from '@/ai/flows/optimize-scan-configuration';
import { fetchIptvData } from '@/ai/flows/fetch-iptv-data';

export async function getAiOptimization(input: OptimizeScanConfigurationInput): Promise<OptimizeScanConfigurationOutput> {
  try {
    const result = await optimizeScanConfiguration(input);
    return result;
  } catch (error) {
    console.error('Error getting AI optimization:', error);
    throw new Error('Failed to get AI optimization suggestions.');
  }
}

export async function fetchXtreamCodesData(serverUrl: string, username: string, password?: string) {
    const baseUrl = `${serverUrl}/player_api.php?username=${username}&password=${password ?? ''}`;

    try {
        const categories = await fetchIptvData({ url: `${baseUrl}&action=get_live_categories` });

        if (!Array.isArray(categories)) {
            console.error('Categories response is not an array or auth failed.', categories);
            throw new Error('Authentication failed or invalid categories format from server.');
        }

        let allStreams: any[] = [];
        for (const category of categories) {
            // As per your logic, skip the 'all' category to avoid duplicates
            if (category.category_id === 'all' || category.category_id === '0') continue; 
            
            try {
                const streams = await fetchIptvData({ url: `${baseUrl}&action=get_live_streams&category_id=${category.category_id}` });
                if (Array.isArray(streams)) {
                    allStreams = [...allStreams, ...streams];
                } else {
                     console.warn(`Could not fetch streams for category ${category.category_name}. The response was not an array.`);
                }
            } catch (e: any) {
                // As per your logic, continue scanning other categories if one fails
                console.warn(`Skipping category "${category.category_name}" due to error:`, e.message);
            }
        }
        
        return allStreams;
    } catch (error: any) {
        console.error('Error fetching Xtream Codes data:', error.message);
        throw new Error(`Failed to connect to the IPTV server. Please check the URL and credentials. Details: ${error.message}`);
    }
}
