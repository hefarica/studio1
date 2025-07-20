import { CONFIG } from './constants';
import type { IPTVServer, Category, Channel, ScanResult } from '@/lib/types';

export class IPTVCore {
  private currentProxyIndex = 0;
  private abortController: AbortController | null = null;

  constructor() {
    this.abortController = new AbortController();
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const controllers: AbortController[] = [];
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      try {
        const response = await fetch(url, {
          ...options,
          signal: timeoutController.signal,
          mode: 'cors',
          headers: { 'User-Agent': 'Studio1-IPTV-Constructor/2.0', 'Accept': 'application/json, text/plain, */*', 'Cache-Control': 'no-cache', ...options.headers }
        });
        if (response.ok) {
          clearTimeout(timeoutId);
          return await response.json();
        } else if (response.status === 512) {
          throw new Error(`Server Error 512: ${response.statusText}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (directError: any) {
        if (directError.message.includes('512')) {} else {}
      }

      for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxyIndex = (this.currentProxyIndex + i) % CONFIG.CORS_PROXIES.length;
        const proxy = CONFIG.CORS_PROXIES[proxyIndex];
        try {
          const proxyController = new AbortController();
          controllers.push(proxyController);
          const proxyTimeout = setTimeout(() => proxyController.abort(), 15000);
          const proxyUrl = proxy + encodeURIComponent(url);
          const response = await fetch(proxyUrl, { signal: proxyController.signal, mode: 'cors', headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' } });
          clearTimeout(proxyTimeout);
          if (response.ok) {
            const data = await response.json();
            clearTimeout(timeoutId);
            let finalData = data.contents ? JSON.parse(data.contents) : data;
            if (this.isValidIPTVResponse(finalData)) {
              this.currentProxyIndex = proxyIndex;
              return finalData;
            }
          }
        } catch (proxyError: any) {}
      }
      throw new Error('Todos los métodos de conexión fallaron');
    } finally {
      clearTimeout(timeoutId);
      controllers.forEach(c => c.abort());
    }
  }

  private isValidIPTVResponse(data: any): boolean {
    if (!data) return false;
    if (data.server_info || data.user_info) return true;
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.category_id || firstItem.category_name) return true;
      if (firstItem.stream_id || firstItem.name) return true;
    }
    return false;
  }

  async testServerConnection(server: IPTVServer, maxRetries = 5): Promise<{ success: boolean; data?: any; error?: string; attempts: number; duration: number; }> {
    const startTime = Date.now();
    for (let attempts = 1; attempts <= maxRetries; attempts++) {
      try {
        const testUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
        const result = await this.makeRequest(testUrl);
        if (result && (result.server_info || result.user_info)) {
          return { success: true, data: result, attempts, duration: Math.round((Date.now() - startTime) / 1000) };
        } else {
          throw new Error('Respuesta del servidor inválida');
        }
      } catch (error: any) {
        if (error.message.includes('512') && attempts < maxRetries) {
          const delay = Math.min(CONFIG.ERROR_512_BASE_DELAY * Math.pow(1.5, attempts - 1), CONFIG.ERROR_512_MAX_DELAY);
          await this.sleep(delay);
        } else if (attempts < maxRetries) {
          await this.sleep(2000);
        } else {
           return { success: false, error: error.message || 'Error desconocido', attempts, duration: Math.round((Date.now() - startTime) / 1000) };
        }
      }
    }
    return { success: false, error: 'Error desconocido', attempts: maxRetries, duration: Math.round((Date.now() - startTime) / 1000) };
  }

  detectProtocol(data: any): string {
    if (data?.server_info && data?.user_info) return 'Xtream Codes API';
    if (typeof data === 'string' && data.includes('#EXTINF')) return 'M3U Plus';
    if (Array.isArray(data)) return 'Panel API';
    return 'Desconocido';
  }
  
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}