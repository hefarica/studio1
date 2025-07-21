/**
 * Filtro Bloom Holístico para Detección Eficaz de Canales IPTV Duplicados
 * Optimizado para procesamiento masivo de listas de canales con alta precisión
 */

import { BloomFilter } from 'bloomfilter';

interface BloomFilterConfig {
  expectedElements: number;
  falsePositiveRate: number;
  hashFunctions: number;
  bitArraySize: number;
}

interface DuplicationResult {
  isDuplicate: boolean;
  confidence: number;
  similarChannels: string[];
  processingTime: number;
}

interface ChannelFingerprint {
  urlHash: string;
  nameHash: string;
  combinedHash: string;
  normalizedName: string;
}

export class IPTVBloomFilter {
  private bt: BloomFilter;
  private channelFingerprints: Map<string, ChannelFingerprint>;
  private duplicateCounter: Map<string, number>;
  private performanceMetrics: {
    totalChecks: number;
    duplicatesFound: number;
    averageProcessingTime: number;
  };
  private config: BloomFilterConfig;

  constructor(expectedChannels: number = 50000) {
    // Configuración optimizada para servidores IPTV masivos
    this.config = this.calculateOptimalConfig(expectedChannels);
    
    // Inicializar filtro Bloom con parámetros heurísticos
    this.bt = new BloomFilter(
      this.config.bitArraySize,
      this.config.hashFunctions
    );

    this.channelFingerprints = new Map();
    this.duplicateCounter = new Map();
    this.performanceMetrics = {
      totalChecks: 0,
      duplicatesFound: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Detección holística de duplicados con análisis heurístico avanzado
   */
  public checkChannelDuplication(
    channelName: string,
    channelUrl: string,
    groupName?: string
  ): DuplicationResult {
    const startTime = performance.now();

    try {
      // Validación de entrada con sanitización
      if (!this.isValidInput(channelName, channelUrl)) {
        return this.createErrorResult('Datos de canal inválidos', startTime);
      }

      // Generar fingerprint holístico del canal
      const fingerprint = this.generateChannelFingerprint(
        channelName,
        channelUrl,
        groupName
      );

      // Verificación multicapa con diferentes niveles de precisión
      const exactDuplicate = this.checkExactDuplicate(fingerprint);
      const similarChannels = this.findSimilarChannels(fingerprint);
      const bloomResult = this.checkBloomFilter(fingerprint);

      // Algoritmo heurístico de decisión
      const isDuplicate = exactDuplicate || this.evaluateDuplicationHeuristics(
        fingerprint,
        similarChannels,
        bloomResult
      );

      const confidence = this.calculateConfidenceScore(
        exactDuplicate,
        similarChannels,
        bloomResult
      );

      // Actualizar estructuras de datos si no es duplicado
      if (!isDuplicate) {
        this.addChannelToIndex(fingerprint);
      } else {
        this.incrementDuplicateCounter(fingerprint.combinedHash);
      }

      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime, isDuplicate);

      return {
        isDuplicate,
        confidence,
        similarChannels: similarChannels.map(fp => fp.normalizedName),
        processingTime
      };

    } catch (error: any) {
      console.error('Error en detección de duplicados:', error);
      return this.createErrorResult(`Error de procesamiento: ${error.message}`, startTime);
    }
  }

  /**
   * Generación de fingerprint holístico con múltiples dimensiones
   */
  private generateChannelFingerprint(
    name: string,
    url: string,
    group?: string
  ): ChannelFingerprint {
    // Normalización inteligente del nombre
    const normalizedName = this.normalizeChannelName(name);
    
    // Normalización de URL con limpieza de parámetros
    const normalizedUrl = this.normalizeChannelUrl(url);
    
    // Generación de hashes con diferentes algoritmos
    const urlHash = this.generateStableHash(normalizedUrl);
    const nameHash = this.generateStableHash(normalizedName);
    
    // Combinación holística incluyendo grupo si está disponible
    const combinedData = group 
      ? `${normalizedName}|${normalizedUrl}|${group.toLowerCase()}`
      : `${normalizedName}|${normalizedUrl}`;
    
    const combinedHash = this.generateStableHash(combinedData);

    return {
      urlHash,
      nameHash,
      combinedHash,
      normalizedName
    };
  }

  /**
   * Normalización inteligente de nombres de canales
   */
  private normalizeChannelName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remover patrones comunes de duplicación
      .replace(/\[.*?\]/g, '') // [HD], [720p], etc.
      .replace(/\(.*?\)/g, '') // (ES), (Latino), etc.
      .replace(/\s*-\s*hd$/i, '') // - HD al final
      .replace(/\s*hd\s*$/i, '') // HD al final
      .replace(/\s*4k\s*$/i, '') // 4K al final
      .replace(/\s*1080p?\s*$/i, '') // 1080p al final
      .replace(/\s*720p?\s*$/i, '') // 720p al final
      .replace(/\s+/g, ' ') // Múltiples espacios a uno
      .replace(/[^\w\s]/g, '') // Caracteres especiales
      .trim();
  }

  /**
   * Normalización de URLs con limpieza heurística
   */
  private normalizeChannelUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remover parámetros que pueden variar pero representar el mismo canal
      const paramsToRemove = ['token', 'auth', 'timestamp', 'session', 'key'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      
      // Normalizar protocolo
      if (urlObj.protocol === 'https:') {
        urlObj.protocol = 'http:'; // Para comparación consistente
      }
      
      return urlObj.toString().toLowerCase();
    } catch {
      // Fallback para URLs malformadas
      return url.toLowerCase().replace(/[?&](token|auth|timestamp|session|key)=[^&]*/g, '');
    }
  }

  /**
   * Verificación exacta de duplicados
   */
  private checkExactDuplicate(fingerprint: ChannelFingerprint): boolean {
    return this.channelFingerprints.has(fingerprint.combinedHash) ||
           this.channelFingerprints.has(fingerprint.urlHash);
  }

  /**
   * Búsqueda heurística de canales similares
   */
  private findSimilarChannels(fingerprint: ChannelFingerprint): ChannelFingerprint[] {
    const similarChannels: ChannelFingerprint[] = [];
    
    for (const [hash, existingFingerprint] of this.channelFingerprints) {
      // Verificar similitud por nombre normalizado
      const nameSimilarity = this.calculateStringSimilarity(
        fingerprint.normalizedName,
        existingFingerprint.normalizedName
      );
      
      // Verificar similitud por URL base
      const urlSimilarity = this.calculateUrlSimilarity(
        fingerprint.urlHash,
        existingFingerprint.urlHash
      );
      
      // Umbral heurístico de similitud
      if (nameSimilarity > 0.85 || urlSimilarity > 0.9) {
        similarChannels.push(existingFingerprint);
      }
    }
    
    return similarChannels;
  }

  /**
   * Verificación optimizada con Bloom Filter
   */
  private checkBloomFilter(fingerprint: ChannelFingerprint): boolean {
    // Verificar múltiples representaciones del canal
    const representations = [
      fingerprint.combinedHash,
      fingerprint.urlHash,
      fingerprint.nameHash
    ];
    
    return representations.some(repr => this.bt.test(repr));
  }

  /**
   * Evaluación heurística de duplicación con múltiples factores
   */
  private evaluateDuplicationHeuristics(
    fingerprint: ChannelFingerprint,
    similarChannels: ChannelFingerprint[],
    bloomResult: boolean
  ): boolean {
    // Factor 1: Resultado del Bloom Filter (peso 30%)
    let score = bloomResult ? 0.3 : 0;
    
    // Factor 2: Canales similares encontrados (peso 40%)
    if (similarChannels.length > 0) {
      const maxSimilarity = Math.max(...similarChannels.map(ch => 
        this.calculateStringSimilarity(fingerprint.normalizedName, ch.normalizedName)
      ));
      score += maxSimilarity * 0.4;
    }
    
    // Factor 3: Frecuencia de aparición del hash (peso 20%)
    const hashFrequency = this.duplicateCounter.get(fingerprint.combinedHash) || 0;
    score += Math.min(hashFrequency / 10, 0.2); // Máximo 0.2
    
    // Factor 4: Patrones comunes de duplicación (peso 10%)
    if (this.hasCommonDuplicationPatterns(fingerprint.normalizedName)) {
      score += 0.1;
    }
    
    return score > 0.6; // Umbral de decisión heurística
  }

  /**
   * Cálculo de score de confianza
   */
  private calculateConfidenceScore(
    exactDuplicate: boolean,
    similarChannels: ChannelFingerprint[],
    bloomResult: boolean
  ): number {
    if (exactDuplicate) return 1.0;
    
    let confidence = 0.0;
    
    if (bloomResult) confidence += 0.4;
    if (similarChannels.length > 0) confidence += 0.5;
    if (similarChannels.length > 2) confidence += 0.1; // Múltiples similares
    
    return Math.min(1.0, confidence);
  }

  /**
   * Cálculo optimizado de configuración del Bloom Filter
   */
  private calculateOptimalConfig(expectedElements: number): BloomFilterConfig {
    const falsePositiveRate = 0.01; // 1% de falsos positivos
    
    // Cálculos basados en fórmulas óptimas de Bloom Filter
    const bitArraySize = Math.ceil(
      -expectedElements * Math.log(falsePositiveRate) / (Math.log(2) * Math.log(2))
    );
    
    const hashFunctions = Math.round(
      (bitArraySize / expectedElements) * Math.log(2)
    );
    
    return {
      expectedElements,
      falsePositiveRate,
      hashFunctions: Math.max(1, Math.min(hashFunctions, 10)),
      bitArraySize: Math.max(bitArraySize, 1000)
    };
  }

  /**
   * Generación de hash estable y distribuido
   */
  private generateStableHash(input: string): string {
    let hash = 0;
    if (input.length === 0) return hash.toString();
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Cálculo de similitud de strings usando algoritmo de distancia
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Algoritmo de distancia de Levenshtein optimizado
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Cálculo de similitud de URLs
   */
  private calculateUrlSimilarity(hash1: string, hash2: string): number {
    return hash1 === hash2 ? 1.0 : 0.0;
  }

  /**
   * Detección de patrones comunes de duplicación
   */
  private hasCommonDuplicationPatterns(name: string): boolean {
    const patterns = [
      /\s*(copy|copia|\d+)$/i,
      /\s*-\s*\d+$/,
      /\s*\(\d+\)$/,
      /\s*(backup|respaldo)$/i
    ];
    
    return patterns.some(pattern => pattern.test(name));
  }

  /**
   * Validación de entrada robusta
   */
  private isValidInput(name: string, url: string): boolean {
    if (typeof name !== 'string' || name.length === 0) return false;
    if (typeof url !== 'string' || url.length === 0) return false;
    // URLs can be relative in some M3U files, so we remove this check for now.
    // if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
    return true;
  }

  /**
   * Adición de canal al índice
   */
  private addChannelToIndex(fingerprint: ChannelFingerprint): void {
    this.channelFingerprints.set(fingerprint.combinedHash, fingerprint);
    
    // Agregar al Bloom Filter
    this.bt.add(fingerprint.combinedHash);
    this.bt.add(fingerprint.urlHash);
    this.bt.add(fingerprint.nameHash);
  }

  /**
   * Incremento de contador de duplicados
   */
  private incrementDuplicateCounter(hash: string): void {
    const currentCount = this.duplicateCounter.get(hash) || 0;
    this.duplicateCounter.set(hash, currentCount + 1);
  }

  /**
   * Actualización de métricas de rendimiento
   */
  private updatePerformanceMetrics(processingTime: number, isDuplicate: boolean): void {
    this.performanceMetrics.totalChecks++;
    if (isDuplicate) this.performanceMetrics.duplicatesFound++;
    
    const totalTime = this.performanceMetrics.averageProcessingTime * 
                     (this.performanceMetrics.totalChecks - 1) + processingTime;
    this.performanceMetrics.averageProcessingTime = totalTime / this.performanceMetrics.totalChecks;
  }

  /**
   * Creación de resultado de error
   */
  private createErrorResult(message: string, startTime: number): DuplicationResult {
    return {
      isDuplicate: false,
      confidence: 0,
      similarChannels: [],
      processingTime: performance.now() - startTime
    };
  }

  // Métodos públicos de utilidad
  public getStatistics() {
    return {
      ...this.performanceMetrics,
      uniqueChannels: this.channelFingerprints.size,
      duplicatePatterns: this.duplicateCounter.size,
      filterSaturation: this.channelFingerprints.size / this.config.expectedElements
    };
  }

  public clearFilter(): void {
    this.bt = new BloomFilter(this.config.bitArraySize, this.config.hashFunctions);
    this.channelFingerprints.clear();
    this.duplicateCounter.clear();
    this.performanceMetrics = {
      totalChecks: 0,
      duplicatesFound: 0,
      averageProcessingTime: 0
    };
  }

  public exportFingerprints(): ChannelFingerprint[] {
    return Array.from(this.channelFingerprints.values());
  }

  public importFingerprints(fingerprints: ChannelFingerprint[]): void {
    fingerprints.forEach(fp => this.addChannelToIndex(fp));
  }
}

// Instancia global optimizada para hot reloads
let globalFilter: IPTVBloomFilter;

/**
 * Función principal exportada para verificación de duplicados
 * Optimizada para el ecosistema del Constructor IPTV Pro
 */
export function isDuplicated(
  channelName: string, 
  channelUrl: string, 
  groupName?: string
): DuplicationResult {
  try {
    // Inicialización lazy con configuración optimizada para IPTV
    if (!globalFilter) {
      globalFilter = new IPTVBloomFilter(100000); // 100k canales esperados
    }
    
    return globalFilter.checkChannelDuplication(channelName, channelUrl, groupName);
    
  } catch (error: any) {
    console.error('Error crítico en verificación de duplicados:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      similarChannels: [],
      processingTime: 0
    };
  }
}

/**
 * Exportación de la instancia global para uso avanzado
 */
export function getBloomFilterInstance(): IPTVBloomFilter {
  if (!globalFilter) {
    globalFilter = new IPTVBloomFilter(100000);
  }
  return globalFilter;
}

/**
 * Reset global del filtro para casos específicos
 */
export function resetGlobalFilter(): void {
  if (globalFilter) {
    globalFilter.clearFilter();
  }
  globalFilter = new IPTVBloomFilter(100000);
}
