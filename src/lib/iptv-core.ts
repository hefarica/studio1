import { CONFIG } from './constants';
import type { IPTVServer, Category, Channel, ScanResult } from '@/types/iptv';
import { IPTVErrorHandler } from './error-handler';


export class IPTVCore {
  private currentProxyIndex = 0;
  private abortController: AbortController | null = null;

  constructor() {
    this.abortController = new AbortController();
    console.log('✅ IPTVCore instanciado correctamente');
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    console.log(`🔗 [REQUEST-START] URL: ${url}`);
    
    const controllers: AbortController[] = [];
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), CONFIG.REQUEST_TIMEOUT);
    
    let lastError = '';
    let attempts = 0;
  
    try {
      // Validar URL primero
      try {
        new URL(url);
        console.log(`✅ [URL-VALID] URL tiene formato correcto`);
      } catch (urlError) {
        throw new Error(`URL inválida: ${url}`);
      }
  
      // INTENTO 1: Conexión directa con headers mejorados
      attempts++;
      try {
        console.log(`🎯 [DIRECT-${attempts}] Intentando conexión directa...`);
        
        const response = await fetch(url, {
          ...options,
          signal: timeoutController.signal,
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            ...options.headers,
          }
        });
  
        clearTimeout(timeoutId);
  
        console.log(`📊 [DIRECT-RESPONSE] Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`📄 [CONTENT-TYPE] ${contentType}`);
          
          if (contentType?.includes('application/json')) {
            const data = await response.json();
            console.log(`✅ [DIRECT-SUCCESS] Respuesta JSON válida recibida`);
            return data;
          } else {
            const text = await response.text();
            console.log(`📝 [DIRECT-TEXT] Respuesta texto: ${text.substring(0, 200)}...`);
            
            // Intentar parsear como JSON si es posible
            try {
              const data = JSON.parse(text);
              console.log(`✅ [DIRECT-SUCCESS] JSON parseado desde texto`);
              return data;
            } catch {
              throw new Error(`Respuesta no es JSON válido: ${text.substring(0, 100)}`);
            }
          }
        } else if (response.status === 512) {
          lastError = `Error 512 del servidor: ${response.statusText}`;
          console.log(`🚫 [DIRECT-512] ${lastError}`);
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`⚠️ [DIRECT-HTTP] ${lastError}`);
        }
        
      } catch (directError: any) {
        lastError = `Conexión directa falló: ${directError.message}`;
        console.log(`❌ [DIRECT-ERROR] ${lastError}`);
      }
  
      // INTENTO 2: Proxies CORS con manejo mejorado
      console.log(`🔄 [PROXY-START] Probando ${CONFIG.CORS_PROXIES.length} proxies...`);
      
      for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxyIndex = (this.currentProxyIndex + i) % CONFIG.CORS_PROXIES.length;
        const proxy = CONFIG.CORS_PROXIES[proxyIndex];
        attempts++;
        
        try {
          console.log(`🔗 [PROXY-${attempts}] Probando: ${proxy.split('/')[2]} (${i + 1}/${CONFIG.CORS_PROXIES.length})`);
          
          const proxyController = new AbortController();
          controllers.push(proxyController);
          
          const proxyTimeout = setTimeout(() => proxyController.abort(), 20000); // 20s para proxies
          
          const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
          
          console.log(`📡 [PROXY-URL] ${proxyUrl.substring(0, 100)}...`);
          
          const proxyResponse = await fetch(proxyUrl, {
            signal: proxyController.signal,
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Cache-Control': 'no-cache',
              'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Scanner/1.0)',
            }
          });
          
          clearTimeout(proxyTimeout);
          
          console.log(`📊 [PROXY-RESPONSE] ${proxy.split('/')[2]} - Status: ${proxyResponse.status}`);
          
          if (proxyResponse.ok) {
            const contentType = proxyResponse.headers.get('content-type');
            let proxyData;
            
            if (contentType?.includes('application/json')) {
              proxyData = await proxyResponse.json();
            } else {
              const text = await proxyResponse.text();
              try {
                proxyData = JSON.parse(text);
              } catch {
                console.log(`⚠️ [PROXY-TEXT] No es JSON: ${text.substring(0, 100)}`);
                continue;
              }
            }
            
            console.log(`📦 [PROXY-DATA] Tipo de respuesta:`, typeof proxyData);
            if(proxyData) console.log(`📦 [PROXY-KEYS] Keys:`, Object.keys(proxyData));
            
            let finalData = proxyData;
            
            // Manejar diferentes formatos de proxy
            if (proxyData?.contents) {
              try {
                finalData = JSON.parse(proxyData.contents);
                console.log(`🔧 [PROXY-PARSE] Contenido parseado desde .contents`);
              } catch (parseError) {
                console.log(`⚠️ [PROXY-PARSE] Error parseando contents:`, parseError);
                finalData = proxyData.contents;
              }
            } else if (proxyData?.response) {
              finalData = proxyData.response;
              console.log(`🔧 [PROXY-PARSE] Usando .response`);
            }
            
            // Validar que sea respuesta IPTV válida
            if (this.isValidIPTVResponse(finalData)) {
              clearTimeout(timeoutId);
              this.currentProxyIndex = proxyIndex;
              console.log(`✅ [PROXY-SUCCESS] Éxito con: ${proxy.split('/')[2]}`);
              return finalData;
            } else {
              console.log(`❌ [PROXY-INVALID] Respuesta no válida para IPTV`);
              if (finalData) console.log(`📄 [PROXY-SAMPLE] Muestra:`, JSON.stringify(finalData).substring(0, 200));
            }
          } else {
            console.log(`❌ [PROXY-HTTP] ${proxy.split('/')[2]} - HTTP ${proxyResponse.status}`);
          }
          
        } catch (proxyError: any) {
          const errorMsg = proxyError.message;
          console.log(`❌ [PROXY-ERROR] ${proxy.split('/')[2]}: ${errorMsg}`);
          
          if (errorMsg.includes('abort')) {
            console.log(`⏰ [PROXY-TIMEOUT] Timeout en ${proxy.split('/')[2]}`);
          }
        }
        
        // Pequeña pausa entre proxies
        await this.sleep(500);
      }
  
      // Si llegamos aquí, todos los métodos fallaron
      const finalError = lastError || 'Todos los métodos de conexión fallaron';
      console.log(`💥 [REQUEST-FAILED] ${finalError} después de ${attempts} intentos`);
      throw new Error(finalError);
  
    } finally {
      clearTimeout(timeoutId);
      controllers.forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          // Ignorar errores de abort
        }
      });
      console.log(`🏁 [REQUEST-END] Finalizado después de ${attempts} intentos`);
    }
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

  private isValidIPTVResponse(data: any): boolean {
    console.log(`🔍 [VALIDATE] Validando respuesta IPTV...`);
    
    if (!data) {
      console.log(`❌ [VALIDATE] Data es null/undefined`);
      return false;
    }
    
    console.log(`📊 [VALIDATE] Tipo de data: ${typeof data}`);
    if (data) console.log(`🔑 [VALIDATE] Keys: ${Object.keys(data).join(', ')}`);
    
    // Validar respuesta de server_info
    if (data.server_info || data.user_info) {
      console.log(`✅ [VALIDATE] Respuesta server_info/user_info válida`);
      return true;
    }
    
    // Validar array de categorías o canales
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      console.log(`🔍 [VALIDATE] Primer item del array:`, firstItem ? Object.keys(firstItem) : "item nulo");
      
      if (firstItem?.category_id || firstItem?.category_name) {
        console.log(`✅ [VALIDATE] Array de categorías válido`);
        return true;
      }
      if (firstItem?.stream_id || firstItem?.name) {
        console.log(`✅ [VALIDATE] Array de canales válido`);
        return true;
      }
    }
    
    // Validar respuesta de texto M3U
    if (typeof data === 'string' && data.includes('#EXTINF')) {
      console.log(`✅ [VALIDATE] Respuesta M3U válida`);
      return true;
    }
    
    console.log(`❌ [VALIDATE] Respuesta no válida para IPTV`);
    if(data) console.log(`📄 [VALIDATE] Muestra de data:`, JSON.stringify(data).substring(0, 300));
    return false;
  }
  

  async testServerConnection(server: IPTVServer, maxRetries = 5): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
    attempts: number;
    diagnosis?: any;
  }> {
    console.log(`🔍 [TEST-CONNECTION] Iniciando prueba de ${server.name}`);
    console.log(`🔍 [TEST-CONNECTION] URL: ${server.url}`);
    console.log(`🔍 [TEST-CONNECTION] Usuario: ${server.username}`);
    
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;
  
    // Paso 1: Validaciones previas
    if (!server.url || !server.url.trim()) {
      return {
        success: false,
        error: 'URL del servidor está vacía',
        duration: 0,
        attempts: 0
      };
    }
  
    if (!server.username || !server.password) {
      return {
        success: false,
        error: 'Credenciales incompletas (usuario o contraseña faltante)',
        duration: 0,
        attempts: 0
      };
    }
  
    // Paso 2: Formatear URL si es necesario
    let serverUrl = server.url.trim();
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = 'http://' + serverUrl;
      console.log(`🔧 [TEST-CONNECTION] URL corregida: ${serverUrl}`);
    }
  
    // Paso 3: Diagnóstico previo
    const diagnosis = await IPTVErrorHandler.diagnoseConnection({
      ...server,
      url: serverUrl
    });
    
    console.log(`🩺 [TEST-CONNECTION] Diagnóstico:`, diagnosis);
  
    // Paso 4: Intentos de conexión con retry inteligente
    for (attempts = 1; attempts <= maxRetries; attempts++) {
      try {
        console.log(`🔄 [TEST-CONNECTION] Intento ${attempts}/${maxRetries} para ${server.name}`);
        
        const testUrl = `${serverUrl}/player_api.php?username=${server.username}&password=${server.password}&action=get_server_info`;
        console.log(`📡 [TEST-CONNECTION] URL completa: ${testUrl}`);
        
        const result = await this.makeRequest(testUrl);
        
        console.log(`📦 [TEST-CONNECTION] Respuesta recibida:`, typeof result);
        if(result) console.log(`🔑 [TEST-CONNECTION] Keys de respuesta:`, Object.keys(result));
        
        if (result && (result.server_info || result.user_info)) {
          const duration = Date.now() - startTime;
          console.log(`✅ [TEST-CONNECTION] ${server.name} exitoso en ${Math.round(duration/1000)}s`);
          
          return {
            success: true,
            data: result,
            duration: Math.round(duration / 1000),
            attempts,
            diagnosis
          };
        } else {
          throw new Error('Respuesta del servidor no contiene server_info ni user_info');
        }
        
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || 'Error desconocido';
        console.log(`❌ [TEST-CONNECTION] Intento ${attempts} falló: ${errorMsg}`);
        
        // Analizar el error para determinar strategy de retry
        if (errorMsg.includes('512')) {
          console.log(`⏱️ [TEST-CONNECTION] Error 512 detectado, esperando más tiempo...`);
          if (attempts < maxRetries) {
            const delay = Math.min(8000 * Math.pow(1.5, attempts - 1), 60000); // Hasta 60s
            console.log(`⏳ [TEST-CONNECTION] Esperando ${Math.round(delay/1000)}s antes del siguiente intento...`);
            await this.sleep(delay);
          }
        } else if (errorMsg.includes('timeout')) {
          console.log(`⏰ [TEST-CONNECTION] Timeout detectado, reintentando con delay corto...`);
          if (attempts < maxRetries) {
            await this.sleep(3000); // 3 segundos para timeout
          }
        } else if (errorMsg.includes('CORS') || errorMsg.includes('fetch')) {
          console.log(`🌐 [TEST-CONNECTION] Error CORS detectado, continuando con próximo proxy...`);
          if (attempts < maxRetries) {
            await this.sleep(1000); // 1 segundo para CORS
          }
        } else {
          console.log(`🔄 [TEST-CONNECTION] Error genérico, retry estándar...`);
          if (attempts < maxRetries) {
            await this.sleep(5000); // 5 segundos estándar
          }
        }
      }
    }
  
    const duration = Date.now() - startTime;
    const finalError = lastError?.message || 'Error desconocido de conexión después de múltiples intentos';
    
    console.log(`💥 [TEST-CONNECTION] ${server.name} falló después de ${attempts} intentos en ${Math.round(duration/1000)}s`);
    
    return {
      success: false,
      error: finalError,
      duration: Math.round(duration / 1000),
      attempts,
      diagnosis
    };
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
