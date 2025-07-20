import { CONFIG } from './constants';
import type { IPTVServer, Category, Channel, ScanResult } from '@/lib/types';

export class IPTVCore {
  private abortController: AbortController | null = null;

  constructor() {
    this.abortController = new AbortController();
  }

  async request(fullUrl: string) {
    const endpoint = `/api/iptv/proxy`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullUrl }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Status ${res.status}: ${text}`);
      }
      return text;
    }

    if (!res.ok) {
      const errorMessage = data?.error || JSON.stringify(data);
      throw new Error(`Status ${res.status}: ${errorMessage}`);
    }
    
    if (data.success) {
        return data.data;
    } else {
        throw new Error(data.error || 'Error desconocido desde el proxy');
    }
  }

  async testServerConnection(server: IPTVServer): Promise<{ success: boolean; data?: any; error?: string; duration: number;}> {
    const startTime = Date.now();
    const url = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
    try {
      const data = await this.request(url);
      const duration = (Date.now() - startTime) / 1000;
      if (data && (data.server_info || data.user_info)) {
        return { success: true, data, duration };
      }
      throw new Error('Respuesta del servidor inválida');
    } catch (err: any) {
      const duration = (Date.now() - startTime) / 1000;
      return { success: false, error: err.message, duration };
    }
  }

  async scanServer(server: IPTVServer): Promise<ScanResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalChannels = 0;

    const connectionTest = await this.testServerConnection(server);
    if (!connectionTest.success) {
      throw new Error(`Conexión fallida antes del escaneo: ${connectionTest.error}`);
    }

    const categories = await this.getCategories(server);
    if (categories.length === 0) {
      console.warn(`⚠️ No se encontraron categorías en ${server.name}`);
    }

    for (const category of categories) {
      try {
        const channels = await this.getChannelsFromCategory(server, category);
        totalChannels += channels.length;
      } catch (categoryError: any) {
        errors.push(`Error en categoría ${category.category_name}: ${categoryError.message}`);
      }
    }
    const duration = Math.round((Date.now() - startTime) / 1000);
    return { success: true, channels: totalChannels, categories: categories.length, errors, duration, serverId: server.id };
  }

  async getCategories(server: Pick<IPTVServer, 'url' | 'username' | 'password'>): Promise<Category[]> {
    const url = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
    const categories = await this.request(url);
    return Array.isArray(categories) ? categories : [];
  }

  async getChannelsFromCategory(server: Pick<IPTVServer, 'url' | 'username' | 'password'>, category: Category): Promise<Channel[]> {
    const url = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id || (category as any).id}`;
    const channels = await this.request(url);
    return Array.isArray(channels) ? channels.filter(this.validateChannel) : [];
  }

  validateChannel(channel: any): boolean {
    return !!(channel && channel.name && channel.name.trim() !== '' && (channel.stream_id || channel.id));
  }

  detectProtocol(data: any): string {
    if (data?.server_info && data?.user_info) return 'Xtream Codes API';
    if (typeof data === 'string' && data.includes('#EXTINF')) return 'M3U Plus';
    if (Array.isArray(data)) return 'Panel API';
    return 'Desconocido';
  }
}
