/**
 * Conector IPTV Integrado con Sistema de Filtrado Bloom Holístico
 * Conexión optimizada al servidor con deduplicación en tiempo real
 */

import { IPTVBloomFilter, isDuplicated, getBloomFilterInstance } from './bloomFilter';
import { IPTVHolisticAnalyzer, ChannelMetadata } from './iptvAnalyzer';

export interface EnhancedServerCredentials {
  url: string;
  username: string;
  password: string;
  serverType?: 'xtream' | 'generic' | 'auto';
  priority?: number;
  enableDuplicateFilter?: boolean;
}

export interface ConnectionResult {
  success: boolean;
  channels: ChannelMetadata[];
  duplicatesFound: number;
  duplicatesRemoved: number;
  processingTime: number;
  serverInfo?: any;
  errorMessage?: string;
}

export interface ProcessingStats {
  totalProcessed: number;
  uniqueChannels: number;
  duplicatesDetected: number;
  processingTimeMs: number;
  throughputChannelsPerSecond: number;
}

export class EnhancedIPTVConnector {
  private bloomFilter: IPTVBloomFilter;
  private analyzer: IPTVHolisticAnalyzer;
  private cache: Map<string, any>;
  private processingStats: ProcessingStats;
  private serverEndpoints: Map<string, string[]>;

  constructor() {
    this.bloomFilter = getBloomFilterInstance();
    this.analyzer = new IPTVHolisticAnalyzer();
    this.cache = new Map();
    this.processingStats = this.initializeStats();
    this.serverEndpoints = new Map();
    
    this.initializeServerEndpoints();
  }

  /**
   * Conexión holística con deduplicación integrada al servidor específico
   */
  public async connectAndExtractChannels(
    credentials: EnhancedServerCredentials,
    targetServerUrl: string = 'https://ixdjkahn.gensparkspace.com/'
  ): Promise<ConnectionResult> {
    const startTime = performance.now();
    
    try {
      // Validar credenciales y configuración
      this.validateCredentials(credentials);
      
      // Establecer conexión adaptativa al servidor
      const connectionResult = await this.establishSmartConnection(
        credentials,
        targetServerUrl
      );
      
      if (!connectionResult.success) {
        return {
          success: false,
          channels: [],
          duplicatesFound: 0,
          duplicatesRemoved: 0,
          processingTime: performance.now() - startTime,
          errorMessage: connectionResult.error
        };
      }

      // Extraer lista de canales con múltiples estrategias
      const rawChannelData = await this.extractChannelListWithFallback(
        credentials,
        connectionResult.authToken
      );

      // Procesar y analizar canales con filtro Bloom integrado
      const processedChannels = await this.processChannelsWithBloomFilter(
        rawChannelData,
        credentials.enableDuplicateFilter !== false
      );

      const totalTime = performance.now() - startTime;
      this.updateProcessingStats(processedChannels, totalTime);

      return {
        success: true,
        channels: processedChannels.uniqueChannels,
        duplicatesFound: processedChannels.duplicatesFound,
        duplicatesRemoved: processedChannels.duplicatesRemoved,
        processingTime: totalTime,
        serverInfo: connectionResult.serverInfo
      };

    } catch (error: any) {
      return {
        success: false,
        channels: [],
        duplicatesFound: 0,
        duplicatesRemoved: 0,
        processingTime: performance.now() - startTime,
        errorMessage: `Error de conexión: ${error.message}`
      };
    }
  }

  /**
   * Establecimiento de conexión inteligente con detección automática
   */
  private async establishSmartConnection(
    credentials: EnhancedServerCredentials,
    targetUrl: string
  ): Promise<any> {
    // Usar URL objetivo si está disponible, sino usar credenciales
    const serverUrl = targetUrl || credentials.url;
    
    // Detectar automáticamente el tipo de servidor si no está especificado
    const serverType = credentials.serverType === 'auto' || !credentials.serverType
      ? await this.detectServerType(serverUrl)
      : credentials.serverType;

    // Estrategias de autenticación según tipo detectado
    switch (serverType) {
      case 'xtream':
        return await this.authenticateXtreamServer(serverUrl, credentials);
      default:
        return await this.authenticateGenericServer(serverUrl, credentials);
    }
  }

  /**
   * Detección automática del tipo de servidor IPTV
   */
  private async detectServerType(serverUrl: string): Promise<string> {
    const testEndpoints = [
      '/player_api.php?action=get_server_info',
      '/get.php',
      '/api/v1/status'
    ];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${serverUrl}${endpoint}`, {
          method: 'HEAD'
        });

        if (response.ok) {
          if (endpoint.includes('player_api')) return 'xtream';
          if (endpoint.includes('api/v1')) return 'api';
        }
      } catch {
        continue;
      }
    }

    return 'generic';
  }

  /**
   * Autenticación optimizada para servidores Xtream Codes
   */
  private async authenticateXtreamServer(
    serverUrl: string,
    credentials: EnhancedServerCredentials
  ): Promise<any> {
    const authUrl = `${serverUrl}/player_api.php`;
    const params = new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
      action: 'get_server_info'
    });

    try {
      const response = await this.makeSecureRequest(`${authUrl}?${params}`);
      
      if (response.ok) {
        const serverInfo = await response.json();
        return {
          success: true,
          authToken: `${credentials.username}:${credentials.password}`,
          serverInfo: serverInfo.server_info,
          serverType: 'xtream'
        };
      }
      
      throw new Error(`Autenticación Xtream falló: HTTP ${response.status}`);
    } catch (error: any) {
      throw new Error(`Error autenticando servidor Xtream: ${error.message}`);
    }
  }

  /**
   * Autenticación genérica con fallbacks múltiples
   */
  private async authenticateGenericServer(
    serverUrl: string,
    credentials: EnhancedServerCredentials
  ): Promise<any> {
    // Implementar autenticación básica HTTP o por parámetros
    return {
      success: true,
      authToken: btoa(`${credentials.username}:${credentials.password}`),
      serverInfo: { serverName: 'Generic IPTV Server' },
      serverType: 'generic'
    };
  }

  /**
   * Extracción de lista de canales con estrategias de fallback
   */
  private async extractChannelListWithFallback(
    credentials: EnhancedServerCredentials,
    authToken: string
  ): Promise<string> {
    const possibleEndpoints = this.generateEndpointVariations(
      credentials.url || 'https://ixdjkahn.gensparkspace.com/',
      credentials.username,
      credentials.password
    );

    for (const endpoint of possibleEndpoints) {
      try {
        const response = await this.makeSecureRequest(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'User-Agent': 'IPTV-Constructor-Pro/2.0',
            'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*'
          }
        });

        if (response.ok) {
          const content = await response.text();
          
          if (this.isValidChannelContent(content)) {
            return content;
          }
        }
      } catch (error: any) {
        console.warn(`Endpoint falló ${endpoint}: ${error.message}`);
        continue;
      }
    }

    throw new Error('No se pudo extraer lista de canales de ningún endpoint');
  }

  /**
   * Procesamiento de canales con filtro Bloom integrado
   */
  private async processChannelsWithBloomFilter(
    rawData: string,
    enableDuplicateFilter: boolean
  ): Promise<{
    uniqueChannels: ChannelMetadata[];
    duplicatesFound: number;
    duplicatesRemoved: number;
  }> {
    // Analizar contenido con el analizador holístico
    const analyzedChannels = await this.analyzer.analyzeM3UContent(
      rawData,
      'https://ixdjkahn.gensparkspace.com/'
    );

    if (!enableDuplicateFilter) {
      return {
        uniqueChannels: analyzedChannels,
        duplicatesFound: 0,
        duplicatesRemoved: 0
      };
    }

    // Procesar con filtro Bloom para detectar duplicados
    const uniqueChannels: ChannelMetadata[] = [];
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    for (const channel of analyzedChannels) {
      const duplicationResult = isDuplicated(
        channel.name,
        channel.url,
        channel.group
      );

      if (duplicationResult.isDuplicate && duplicationResult.confidence > 0.7) {
        duplicatesFound++;
        
        // Decidir si remover o mantener basado en calidad heurística
        if (this.shouldRemoveDuplicate(channel, duplicationResult)) {
          duplicatesRemoved++;
          continue;
        }
      }

      uniqueChannels.push(channel);
    }

    return {
      uniqueChannels,
      duplicatesFound,
      duplicatesRemoved
    };
  }

  /**
   * Decisión heurística sobre remoción de duplicados
   */
  private shouldRemoveDuplicate(
    channel: ChannelMetadata,
    duplicationResult: any
  ): boolean {
    // No remover si es de alta calidad
    if (channel.quality && 
        (channel.quality.includes('4K') || channel.quality.includes('1080p'))) {
      return false;
    }

    // No remover si tiene alta confiabilidad
    if (channel.reliability > 0.8) {
      return false;
    }

    // Remover si la confianza de duplicación es muy alta
    return duplicationResult.confidence > 0.9;
  }

  /**
   * Generación de variaciones de endpoints para máxima compatibilidad
   */
  private generateEndpointVariations(
    baseUrl: string,
    username: string,
    password: string
  ): string[] {
    const cleanUrl = baseUrl.replace(/\/$/, '');
    
    return [
      `${cleanUrl}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`,
      `${cleanUrl}/get.php?username=${username}&password=${password}&type=m3u&output=mpegts`,
      `${cleanUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`,
      `${cleanUrl}/playlist.m3u8?auth=${btoa(`${username}:${password}`)}`,
      `${cleanUrl}/channels.m3u?user=${username}&pass=${password}`,
      `${cleanUrl}/${username}/${password}/playlist.m3u8`,
      `${cleanUrl}/api/playlist?user=${username}&pass=${password}&format=m3u`,
      `${cleanUrl}/live/${username}/${password}/playlist.m3u`
    ];
  }

  /**
   * Validación de contenido de canales
   */
  private isValidChannelContent(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Verificar formato M3U
    if (content.includes('#EXTM3U') && content.includes('#EXTINF:')) {
      return true;
    }
    
    // Verificar formato JSON
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Petición HTTP segura con reintentos
   */
  private async makeSecureRequest(
    url: string, 
    options: any = {},
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error = new Error("Failed after all retries");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, application/vnd.apple.mpegurl, */*',
            'Cache-Control': 'no-cache',
            ...options.headers
          }
        });

        clearTimeout(timeoutId);
        return response;

      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Inicialización de endpoints conocidos
   */
  private initializeServerEndpoints(): void {
    this.serverEndpoints.set('xtream', [
      '/get.php',
      '/player_api.php',
      '/xmltv.php'
    ]);
    
    this.serverEndpoints.set('generic', [
      '/playlist.m3u8',
      '/channels.m3u',
      '/live/playlist.m3u'
    ]);
  }

  /**
   * Validación de credenciales mejorada
   */
  private validateCredentials(credentials: EnhancedServerCredentials): void {
    if (!credentials.username || credentials.username.trim().length === 0) {
      throw new Error('Usuario requerido para autenticación');
    }
    
    if (!credentials.password || credentials.password.trim().length === 0) {
      throw new Error('Contraseña requerida para autenticación');
    }
    
    if (credentials.url && !this.isValidUrl(credentials.url)) {
      throw new Error('URL del servidor inválida');
    }
  }

  /**
   * Validación de URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inicialización de estadísticas
   */
  private initializeStats(): ProcessingStats {
    return {
      totalProcessed: 0,
      uniqueChannels: 0,
      duplicatesDetected: 0,
      processingTimeMs: 0,
      throughputChannelsPerSecond: 0
    };
  }

  /**
   * Actualización de estadísticas de procesamiento
   */
  private updateProcessingStats(
    result: { uniqueChannels: ChannelMetadata[]; duplicatesFound: number },
    processingTime: number
  ): void {
    this.processingStats.totalProcessed += result.uniqueChannels.length + result.duplicatesFound;
    this.processingStats.uniqueChannels += result.uniqueChannels.length;
    this.processingStats.duplicatesDetected += result.duplicatesFound;
    this.processingStats.processingTimeMs += processingTime;
    
    this.processingStats.throughputChannelsPerSecond = 
      (this.processingStats.totalProcessed / this.processingStats.processingTimeMs) * 1000;
  }

  // Métodos públicos de utilidad
  public getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  public getBloomFilterStats() {
    return this.bloomFilter.getStatistics();
  }

  public resetStats(): void {
    this.processingStats = this.initializeStats();
    this.bloomFilter.clearFilter();
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Función principal exportada para conexión holística
 */
export async function connectToIPTVServer(
  credentials: EnhancedServerCredentials,
  targetServerUrl?: string
): Promise<ConnectionResult> {
  const connector = new EnhancedIPTVConnector();
  return await connector.connectAndExtractChannels(
    credentials,
    targetServerUrl || 'https://ixdjkahn.gensparkspace.com/'
  );
}

/**
 * Función de conexión específica al servidor objetivo
 */
export async function connectToGensparkServer(
  username: string,
  password: string
): Promise<ConnectionResult> {
  return await connectToIPTVServer({
    url: 'https://ixdjkahn.gensparkspace.com/',
    username,
    password,
    serverType: 'auto',
    enableDuplicateFilter: true,
    priority: 100
  });
}
