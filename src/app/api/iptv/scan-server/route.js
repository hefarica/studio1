import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { z } from 'zod';
import { CONFIG } from '@/lib/constants';

export const runtime = 'nodejs'; // Force Node.js runtime for compatibility

// Zod schemas for robust validation
const CategorySchema = z.object({
  category_id: z.string(),
  category_name: z.string(),
});
const ChannelSchema = z.object({
  stream_id: z.coerce.string(),
  name: z.string(),
  stream_icon: z.string().optional(),
  category_id: z.coerce.string(),
});
const ServerInfoSchema = z.object({
  server_info: z.any(),
  user_info: z.any().optional(),
});

/**
 * A resilient fetch function that attempts a direct connection first,
 * then falls back to a list of CORS proxies with exponential backoff.
 * @param {string} url - The URL to fetch.
 * @param {number} timeout - Request timeout in milliseconds.
 * @returns {Promise<any>} - The JSON response from the server.
 */
async function safeFetchJSON(url, timeout = CONFIG.REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Attempt 1: Direct connection
    const directRes = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (directRes.ok) {
      clearTimeout(timeoutId);
      return await directRes.json();
    }
    // Log non-200 direct responses but continue to proxies
    console.warn(`[safeFetch] Direct request to ${url} failed with status: ${directRes.status}`);
  } catch (err) {
    if (err instanceof Error) {
        // Log direct connection errors but continue to proxies
        console.warn(`[safeFetch] Direct request to ${url} failed: ${err.message}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Fallback to CORS proxies if direct fails
  for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
    const proxyUrl = `${CONFIG.CORS_PROXIES[i]}${encodeURIComponent(url)}`;
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), timeout);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500 * i)); // Exponential backoff
      const proxyRes = await fetch(proxyUrl, { signal: proxyController.signal });
      if (proxyRes.ok) {
        clearTimeout(proxyTimeoutId);
        const text = await proxyRes.text();
        // Some proxies wrap the response in a 'contents' object
        try {
          const json = JSON.parse(text);
          return json.contents ? JSON.parse(json.contents) : json;
        } catch {
          throw new Error("Failed to parse JSON from proxy.");
        }
      }
    } catch (err) {
        if (err instanceof Error) {
            console.warn(`[safeFetch] Proxy ${i + 1} failed: ${err.message}`);
        }
    } finally {
        clearTimeout(proxyTimeoutId);
    }
  }

  throw new Error(`All fetch attempts failed for URL: ${url}`);
}

export async function POST(request) {
  try {
    const { server } = await request.json();
    if (!server || !server.url || !server.username || !server.password) {
      return NextResponse.json({ error: 'Datos del servidor incompletos' }, { status: 400 });
    }

    // Step 1: Get Server Info to validate connection
    const serverInfoUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
    const serverInfoRaw = await safeFetchJSON(serverInfoUrl);
    const serverInfoParsed = ServerInfoSchema.safeParse(serverInfoRaw);
    if (!serverInfoParsed.success) {
      throw new Error(`Respuesta de información del servidor inválida: ${serverInfoParsed.error.message}`);
    }

    // Step 2: Get Categories
    const categoriesUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
    const categoriesRaw = await safeFetchJSON(categoriesUrl);
    const categoriesParsed = z.array(CategorySchema).safeParse(categoriesRaw);
    if (!categoriesParsed.success) {
      throw new Error(`Respuesta de categorías inválida: ${categoriesParsed.error.message}`);
    }
    const categories = categoriesParsed.data;

    // Step 3: Scan all categories in parallel with a concurrency limit
    const limit = pLimit(CONFIG.MAX_PARALLEL);
    const channelCounts = await Promise.all(
      categories.map(category =>
        limit(async () => {
          try {
            const channelsUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id}`;
            const channelsRaw = await safeFetchJSON(channelsUrl, 20000); // Longer timeout for channels
            const channelsParsed = z.array(ChannelSchema).safeParse(channelsRaw);
            if (channelsParsed.success) {
              return channelsParsed.data.length;
            }
            console.warn(`[SCAN] Categoría ${category.category_name} con formato inválido: ${channelsParsed.error.message}`);
            return 0; // Return 0 for invalid categories but don't fail the whole scan
          } catch (error) {
            if (error instanceof Error) {
                console.warn(`[SCAN] Error obteniendo canales de categoría ${category.category_name}: ${error.message}`);
            }
            return 0; // Don't fail the whole scan for one bad category
          }
        })
      )
    );

    const totalChannels = channelCounts.reduce((acc, count) => acc + count, 0);

    const results = {
      serverInfo: serverInfoParsed.data.server_info,
      categories,
      totalChannels,
      protocol: 'Xtream Codes', // Detected from successful server_info call
      error: null
    };

    return NextResponse.json({ success: true, results });

  } catch (error) {
    if (error instanceof Error) {
        console.error(`[API/scan-server] Fatal error: ${error.message}`);
        return NextResponse.json({ success: false, results: null, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ success: false, results: null, error: 'An unknown error occurred' }, { status: 502 });
  }
}
