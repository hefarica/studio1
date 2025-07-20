import { CONFIG } from './constants';
import type { IPTVServer, Category, Channel, ScanResult } from './types';

export class IPTVCore {
  private currentProxyIndex = 0;
  private abortController: AbortController | null = null;

  constructor() {
    this.abortController = new AbortController();
    console.log('✅ IPTVCore instanciado correctamente');
  }

  // ===== MÉTODO SCAN SERVER (ASEGURAR QUE EXISTE) =====
  async scanServer(
    server: IPTVServer, 
    progressCallback?: (progress: any) => void,
    shouldStop?: () => boolean
  ): Promise<ScanResult> {
    console.log(`🚀 [SCAN-SERVER] Iniciando escaneo de ${server.name}`);
    
    const startTime = Date.now();
    const errors: string[] = [];
    let totalChannels = 0;
    let categoriesProcessed = 0;

    try {
      // Validar servidor
      if (!server || !server.name || !server.url) {
        throw new Error('Servidor inválido - faltan datos requeridos');
      }

      // Paso 1: Probar conexión
      progressCallback?.({ 
        step: 'connection', 
        message: `Conectando a ${server.name}...`,
        percentage: 0 
      });

      const connectionTest = await this.testServerConnection(server);
      if (!connectionTest.success) {
        throw new Error(`Conexión fallida: ${connectionTest.error}`);
      }

      console.log(`✅ [SCAN-SERVER] Conexión exitosa a ${server.name}`);

      // Paso 2: Obtener categorías
      progressCallback?.({ 
        step: 'categories', 
        message: 'Obteniendo categorías...',
        percentage: 10 
      });

      const categories = await this.getCategories(server);
      if (categories.length === 0) {
        console.warn(`⚠️ [SCAN-SERVER] No se encontraron categorías en ${server.name}`);
        // No lanzar error, continuar con categorías vacías
      }

      console.log(`📂 [SCAN-SERVER] ${categories.length} categorías encontradas`);

      // Paso 3: Procesar categorías
      for (let i = 0; i < categories.length; i++) {
        if (shouldStop?.()) {
          console.log(`⏹️ [SCAN-SERVER] Detenido por usuario`);
          break;
        }

        const category = categories[i];
        const categoryProgress = Math.round(10 + (i / categories.length) * 80);

        try {
          progressCallback?.({
            step: 'processing',
            message: `Procesando: ${category.category_name}`,
            percentage: categoryProgress,
            currentCategory: category.category_name,
            categoriesProcessed: i + 1,
            totalCategories: categories.length
          });

          const channels = await this.getChannelsFromCategory(server, category);
          
          if (channels.length > 0) {
            const chunks = this.chunkArray(channels, CONFIG.CHUNK_SIZE);
            
            for (const chunk of chunks) {
              if (shouldStop?.()) break;
              
              const processedChannels = chunk.filter(ch => this.validateChannel(ch));
              totalChannels += processedChannels.length;
              
              // Pausa para no saturar
              await this.sleep(CONFIG.SLEEP_TIME);
            }
          }

          categoriesProcessed++;

        } catch (categoryError: any) {
          const errorMsg = `Error en categoría ${category.category_name}: ${categoryError.message}`;
          errors.push(errorMsg);
          console.warn(`⚠️ [SCAN-SERVER] ${errorMsg}`);
        }

        // Pausa entre categorías
        await this.sleep(500);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      progressCallback?.({
        step: 'completed',
        message: `Escaneo completado: ${totalChannels} canales`,
        percentage: 100,
        totalChannels,
        categoriesProcessed
      });

      console.log(`🎉 [SCAN-SERVER] ${server.name} completado: ${totalChannels} canales en ${duration}s`);

      return {
        success: true,
        channels: totalChannels,
        categories: categoriesProcessed,
        errors,
        duration,
        serverId: server.id
      };

    } catch (error: any) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const errorMsg = error.message || 'Error desconocido durante escaneo';
      errors.push(errorMsg);

      console.error(`💥 [SCAN-SERVER] ${server.name} falló: ${errorMsg}`);

      return {
        success: false,
        channels: totalChannels,
        categories: categoriesProcessed,
        errors,
        duration,
        serverId: server.id
      };
    }
  }

  // ===== OTROS MÉTODOS REQUERIDOS =====
  async testServerConnection(server: IPTVServer, maxRetries = 3): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
  }> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[TEST ${attempt}/${maxRetries}] ${server.name}`);
        
        const testUrl = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
        const result = await this.makeRequest(testUrl);
        
        if (result && (result.server_info || result.user_info)) {
          const duration = Date.now() - startTime;
          return {
            success: true,
            data: result,
            duration: Math.round(duration / 1000)
          };
        } else {
          throw new Error('Respuesta del servidor inválida');
        }
        
      } catch (error: any) {
        lastError = error;
        console.log(`❌ [TEST ${attempt}] ${server.name}: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.min(5000 * attempt, 15000); // 5s, 10s, 15s
          await this.sleep(delay);
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Error desconocido',
      duration: Math.round(duration / 1000)
    };
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      console.log(`[REQUEST] ${url}`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Studio1-IPTV-Constructor/2.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...options.headers,
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ [REQUEST] Exitosa`);
        return data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`❌ [REQUEST] ${error.message}`);
      throw error;
    }
  }

  async getCategories(server: IPTVServer): Promise<Category[]> {
    try {
      const url = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_categories`;
      const categories = await this.makeRequest(url);
      
      if (Array.isArray(categories)) {
        return categories;
      }
      
      return [];
    } catch (error: any) {
      console.error(`❌ [CATEGORIES] Error en ${server.name}:`, error.message);
      return [];
    }
  }

  async getChannelsFromCategory(server: IPTVServer, category: Category): Promise<any[]> {
    try {
      const url = `${server.url}/player_api.php?username=${server.username}&password=${server.password}&action=get_live_streams&category_id=${category.category_id}`;
      const channels = await this.makeRequest(url);
      
      if (Array.isArray(channels)) {
        return channels.filter(ch => this.validateChannel(ch));
      }
      
      return [];
    } catch (error: any) {
      console.error(`❌ [CHANNELS] Error en ${category.category_name}:`, error.message);
      return [];
    }
  }

  validateChannel(channel: any): boolean {
    return !!(
      channel && 
      channel.name && 
      channel.name.trim() !== '' && 
      (channel.stream_id || channel.id)
    );
  }

  buildStreamURL(server: IPTVServer, channel: any): string {
    const streamId = channel.stream_id || channel.id;
    return `${server.url}/live/${server.username}/${server.password}/${streamId}.ts`;
  }

  detectProtocol(data: any): string {
    if (data?.server_info && data?.user_info) {
      return 'Xtream Codes API';
    } else if (typeof data === 'string' && data.includes('#EXTINF')) {
      return 'M3U Plus';
    } else if (Array.isArray(data)) {
      return 'Panel API';
    } else {
      return 'Desconocido';
    }
  }

  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
