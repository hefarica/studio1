/**
 * Filtro Bloom Holístico para Detección Eficaz de Canales IPTV Duplicados
 * Optimizado para procesamiento masivo de listas de canales con alta precisión
 */

import { BloomFilter } from 'bloomfilter';

interface BloomFilterConfig {
  expectedElements: number;
  falsePositiveRate: number;
  hashFunctions?: number;
  bitArraySize?: number;
}

interface DuplicationResult {
  isDuplicate: boolean;
  confidence: number;
  similarChannels: string[];
  processingTime: number;
  duplicateType: 'exact' | 'similar' | 'potential' | 'none';
}

interface ChannelSignature {
  nameHash: string;
  urlHash: string;
  normalizedName: string;
  normalizedUrl: string;
  combinedHash: string;
  group?: string;
}

export class IPTVBloomFilter {
  private bloomFilter: BloomFilter;
  private channelSignatures: Map<string, ChannelSignature>;
  private duplicateStats: Map<string, number>;
  private config: BloomFilterConfig;
  private heuristicWeights: { [key: string]: number };

  constructor(expectedChannels: number = 50000) {
    this.config = this.calculateOptimalConfiguration(expectedChannels);
    this.initializeBloomFilter();
    this.channelSignatures = new Map();
    this.duplicateStats = new Map();
    this.initializeHeuristicWeights();
  }

  /**
   * Verificación holística de duplicación con análisis multi-dimensional
   */
  public checkDuplication(
    channelName: string, 
    channelUrl: string, 
    channelGroup?: string
  ): DuplicationResult {
    const startTime = performance.now();

    try {
      // Validar entrada
      if (!this.isValidInput(channelName, channelUrl)) {
        return this.createErrorResult('Entrada inválida', startTime);
      }

      // Generar firma digital del canal
      const signature = this.generateChannelSignature(channelName, channelUrl, channelGroup);

      // Verificación en múltiples niveles
      const exactMatch = this.checkExactDuplicate(signature);
      const similarChannels = this.findSimilarChannels(signature);
      const bloomResult = this.checkBloomFilter(signature);

      // Análisis heurístico de duplicación
      const heuristicScore = this.calculateHeuristicScore(signature, similarChannels, bloomResult);
      const isDuplicate = heuristicScore.isDuplicate;
      const duplicateType = this.determineDuplicateType(exactMatch, similarChannels, heuristicScore);

      // Registrar canal si no es duplicado
      if (!isDuplicate) {
        this.registerChannel(signature);
      } else {
        this.recordDuplicate(signature.combinedHash);
      }

      const processingTime = performance.now() - startTime;

      return {
        isDuplicate,
        confidence: heuristicScore.confidence,
        similarChannels: similarChannels.map(s => s.normalizedName),
        processingTime,
        duplicateType
      };

    } catch (error: any) {
      console.error('Error en verificación de duplicación:', error);
      return this.createErrorResult(`Error: ${error.message}`, startTime);
    }
  }

  /**
   * Generación de firma digital holística del canal
   */
  private generateChannelSignature(
    name: string, 
    url: string, 
    group?: string
  ): ChannelSignature {
    // Normalización avanzada del nombre
    const normalizedName = this.normalizeChannelName(name);
    
    // Normalización de URL con limpieza profunda
    const normalizedUrl = this.normalizeChannelUrl(url);
    
    // Generación de hashes únicos
    const nameHash = this.generateHash(normalizedName);
    const urlHash = this.generateHash(normalizedUrl);
    
    // Hash combinado con peso heurístico
    const combinedData = group 
      ? `${normalizedName}|${normalizedUrl}|${group.toLowerCase().trim()}`
      : `${normalizedName}|${normalizedUrl}`;
    const combinedHash = this.generateHash(combinedData);

    return {
      nameHash,
      urlHash,
      normalizedName,
      normalizedUrl,
      combinedHash,
      group: group?.toLowerCase().trim()
    };
  }

  /**
   * Normalización inteligente de nombres de canales
   */
  private normalizeChannelName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remover indicadores de calidad
      .replace(/\s*\[?(4k|uhd|fhd|hd|1080p?|720p?|480p?|sd)\]?\s*/gi, '')
      // Remover indicadores de idioma
      .replace(/\s*\[?(es|en|pt|fr|latino?|spanish|english)\]?\s*/gi, '')
      // Remover patrones de duplicación
      .replace(/\s*\[.*?\]\s*/g, '') // Contenido entre corchetes
      .replace(/\s*\(.*?\)\s*/g, '') // Contenido entre paréntesis
      .replace(/\s*-\s*(hd|4k|uhd)$/gi, '') // Sufijos de calidad
      .replace(/\s*copy\s*\d*$/gi, '') // Indicadores de copia
      .replace(/\s*backup\s*\d*$/gi, '') // Indicadores de backup
      // Normalización de espacios y caracteres
      .replace(/\s+/g, ' ') // Múltiples espacios a uno
      .replace(/[^\w\s]/g, '') // Caracteres especiales excepto espacios
      .trim();
  }

  /**
   * Normalización avanzada de URLs
   */
  private normalizeChannelUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remover parámetros variables comunes
      const volatileParams = [
        'token', 'auth', 'timestamp', 'session', 'key', 'time', 
        'signature', 'expires', 'hash', 'nonce', 'rand'
      ];
      
      volatileParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // Normalizar protocolo para comparación
      if (urlObj.protocol === 'https:') {
        urlObj.protocol = 'http:';
      }
      
      // Normalizar puerto por defecto
      if (urlObj.port === '80' || urlObj.port === '443') {
        urlObj.port = '';
      }
      
      return urlObj.toString().toLowerCase();
    } catch {
      // Fallback para URLs malformadas
      return url
        .toLowerCase()
        .replace(/[?&](token|auth|timestamp|session|key|time|signature|expires|hash|nonce|rand)=[^&]*/g, '')
        .replace(/https?:\/\//, 'http://');
    }
  }

  /**
   * Verificación de duplicado exacto
   */
  private checkExactDuplicate(signature: ChannelSignature): boolean {
    return this.channelSignatures.has(signature.combinedHash) ||
           this.channelSignatures.has(signature.urlHash) ||
           this.channelSignatures.has(signature.nameHash);
  }

  /**
   * Búsqueda heurística de canales similares
   */
  private findSimilarChannels(signature: ChannelSignature): ChannelSignature[] {
    const similarChannels: ChannelSignature[] = [];
    const threshold = 0.8; // Umbral de similitud

    for (const existingSignature of this.channelSignatures.values()) {
      // Similitud de nombres
      const nameSimilarity = this.calculateSimilarity(
        signature.normalizedName, 
        existingSignature.normalizedName
      );
      
      // Similitud de URLs base
      const urlSimilarity = this.calculateUrlBaseSimilarity(
        signature.normalizedUrl, 
        existingSignature.normalizedUrl
      );
      
      // Similitud de grupo (si ambos tienen)
      const groupSimilarity = (signature.group && existingSignature.group)
        ? this.calculateSimilarity(signature.group, existingSignature.group)
        : 0;

      // Puntuación ponderada
      const overallSimilarity = (
        nameSimilarity * this.heuristicWeights.name +
        urlSimilarity * this.heuristicWeights.url +
        groupSimilarity * this.heuristicWeights.group
      );

      if (overallSimilarity >= threshold) {
        similarChannels.push(existingSignature);
      }
    }

    return similarChannels.slice(0, 5); // Limitar a 5 similares más relevantes
  }

  /**
   * Verificación con Bloom Filter
   */
  private checkBloomFilter(signature: ChannelSignature): boolean {
    return this.bloomFilter.test(signature.combinedHash) ||
           this.bloomFilter.test(signature.nameHash) ||
           this.bloomFilter.test(signature.urlHash);
  }

  /**
   * Cálculo de score heurístico de duplicación
   */
  private calculateHeuristicScore(
    signature: ChannelSignature, 
    similarChannels: ChannelSignature[], 
    bloomResult: boolean
  ): { isDuplicate: boolean; confidence: number } {
    let score = 0;
    let confidence = 0;

    // Factor 1: Resultado del Bloom Filter (20%)
    if (bloomResult) {
      score += 0.2;
      confidence += 0.2;
    }

    // Factor 2: Canales similares encontrados (40%)
    if (similarChannels.length > 0) {
      const maxSimilarity = Math.max(...similarChannels.map(similar => 
        this.calculateSimilarity(signature.normalizedName, similar.normalizedName)
      ));
      score += maxSimilarity * 0.4;
      confidence += maxSimilarity * 0.3;
    }

    // Factor 3: Frecuencia de aparición (20%)
    const frequency = this.duplicateStats.get(signature.combinedHash) || 0;
    const frequencyScore = Math.min(frequency / 5, 0.2);
    score += frequencyScore;
    confidence += frequencyScore;

    // Factor 4: Patrones de duplicación conocidos (20%)
    if (this.hasKnownDuplicationPatterns(signature.normalizedName)) {
      score += 0.2;
      confidence += 0.15;
    }

    const isDuplicate = score >= 0.65; // Umbral de decisión
    confidence = Math.min(1.0, confidence);

    return { isDuplicate, confidence };
  }

  /**
   * Determinación del tipo de duplicado
   */
  private determineDuplicateType(
    exactMatch: boolean, 
    similarChannels: ChannelSignature[], 
    heuristicScore: { isDuplicate: boolean; confidence: number }
  ): 'exact' | 'similar' | 'potential' | 'none' {
    
    if (exactMatch) return 'exact';
    
    if (similarChannels.length > 0 && heuristicScore.confidence > 0.8) {
      return 'similar';
    }
    
    if (heuristicScore.isDuplicate && heuristicScore.confidence > 0.6) {
      return 'potential';
    }
    
    return 'none';
  }

  /**
   * Cálculo de similitud usando algoritmo de Jaro-Winkler optimizado
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    // Algoritmo de Jaro-Winkler simplificado para performance
    const maxDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const matches = [];
    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matchCount = 0;
    let transpositions = 0;

    // Encontrar matches
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - maxDistance);
      const end = Math.min(i + maxDistance + 1, str2.length);
      
      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = str2Matches[j] = true;
        matches.push([i, j]);
        matchCount++;
        break;
      }
    }

    if (matchCount === 0) return 0.0;

    // Contar transposiciones
    matches.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < matches.length; i++) {
      if (str1[matches[i][0]] !== str2[matches[i][1]]) {
        transpositions++;
      }
    }

    // Cálculo de Jaro
    const jaro = (matchCount / str1.length + 
                  matchCount / str2.length + 
                  (matchCount - transpositions/2) / matchCount) / 3;

    return jaro;
  }

  /**
   * Cálculo de similitud de URL base
   */
  private calculateUrlBaseSimilarity(url1: string, url2: string): number {
    try {
      const host1 = new URL(url1).hostname;
      const host2 = new URL(url2).hostname;
      
      if (host1 === host2) return 1.0;
      
      // Verificar subdominios del mismo dominio
      const domain1 = host1.split('.').slice(-2).join('.');
      const domain2 = host2.split('.').slice(-2).join('.');
      
      return domain1 === domain2 ? 0.8 : 0.0;
    } catch {
      return url1 === url2 ? 1.0 : 0.0;
    }
  }

  /**
   * Detección de patrones conocidos de duplicación
   */
  private hasKnownDuplicationPatterns(name: string): boolean {
    const patterns = [
      /\s*copy\s*\d*$/i,
      /\s*backup\s*\d*$/i,
      /\s*\(\d+\)$/,
      /\s*-\s*\d+$/,
      /\s*duplicate$/i,
      /\s*mirror$/i
    ];

    return patterns.some(pattern => pattern.test(name));
  }

  /**
   * Generación de hash estable y distribuido
   */
  private generateHash(input: string): string {
    let hash = 0;
    if (input.length === 0) return hash.toString();

    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Configuración óptima del Bloom Filter
   */
  private calculateOptimalConfiguration(expectedElements: number): BloomFilterConfig {
    const falsePositiveRate = 0.005; // 0.5% de falsos positivos
    
    const bitArraySize = Math.ceil(
      -expectedElements * Math.log(falsePositiveRate) / (Math.log(2) * Math.log(2))
    );
    
    const hashFunctions = Math.round((bitArraySize / expectedElements) * Math.log(2));
    
    return {
      expectedElements,
      falsePositiveRate,
      hashFunctions: Math.max(1, Math.min(hashFunctions, 12)),
      bitArraySize: Math.max(bitArraySize, 1000)
    };
  }

  /**
   * Inicialización del Bloom Filter
   */
  private initializeBloomFilter(): void {
    this.bloomFilter = new BloomFilter(
      this.config.bitArraySize || 32 * 1024, // 32KB por defecto
      this.config.hashFunctions || 4
    );
  }

  /**
   * Inicialización de pesos heurísticos
   */
  private initializeHeuristicWeights(): void {
    this.heuristicWeights = {
      name: 0.5,    // 50% peso al nombre
      url: 0.35,    // 35% peso a la URL
      group: 0.15   // 15% peso al grupo
    };
  }

  /**
   * Registro de canal único
   */
  private registerChannel(signature: ChannelSignature): void {
    this.channelSignatures.set(signature.combinedHash, signature);
    
    // Agregar al Bloom Filter
    this.bloomFilter.add(signature.combinedHash);
    this.bloomFilter.add(signature.nameHash);
    this.bloomFilter.add(signature.urlHash);
  }

  /**
   * Registro de duplicado encontrado
   */
  private recordDuplicate(hash: string): void {
    const count = this.duplicateStats.get(hash) || 0;
    this.duplicateStats.set(hash, count + 1);
  }

  /**
   * Validación de entrada
   */
  private isValidInput(name: string, url: string): boolean {
    return typeof name === 'string' && name.length > 0 &&
           typeof url === 'string' && url.length > 0 &&
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  /**
   * Creación de resultado de error
   */
  private createErrorResult(message: string, startTime: number): DuplicationResult {
    return {
      isDuplicate: false,
      confidence: 0,
      similarChannels: [],
      processingTime: performance.now() - startTime,
      duplicateType: 'none'
    };
  }

  // Métodos públicos de utilidad
  public getStatistics() {
    return {
      uniqueChannels: this.channelSignatures.size,
      totalDuplicates: Array.from(this.duplicateStats.values()).reduce((a, b) => a + b, 0),
      bloomFilterSize: this.config.bitArraySize,
      expectedCapacity: this.config.expectedElements,
      saturationLevel: (this.channelSignatures.size / this.config.expectedElements) * 100
    };
  }

  public resetFilter(): void {
    this.initializeBloomFilter();
    this.channelSignatures.clear();
    this.duplicateStats.clear();
  }

  public exportSignatures(): ChannelSignature[] {
    return Array.from(this.channelSignatures.values());
  }
}

// Instancia global para reutilización
let globalBloomFilter: IPTVBloomFilter;

/**
 * Función principal para verificación de duplicados
 */
export function isDuplicated(
  channelName: string, 
  channelUrl: string, 
  channelGroup?: string
): DuplicationResult {
  try {
    if (!globalBloomFilter) {
      globalBloomFilter = new IPTVBloomFilter(100000); // 100K canales esperados
    }
    
    return globalBloomFilter.checkDuplication(channelName, channelUrl, channelGroup);
  } catch (error: any) {
    console.error('Error crítico en verificación de duplicados:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      similarChannels: [],
      processingTime: 0,
      duplicateType: 'none'
    };
  }
}

/**
 * Obtener instancia global del filtro
 */
export function getBloomFilterInstance(): IPTVBloomFilter {
  if (!globalBloomFilter) {
    globalBloomFilter = new IPTVBloomFilter(100000);
  }
  return globalBloomFilter;
}

/**
 * Reiniciar filtro global
 */
export function resetGlobalBloomFilter(): void {
  if (globalBloomFilter) {
    globalBloomFilter.resetFilter();
  }
  globalBloomFilter = new IPTVBloomFilter(100000);
}

/**
 * Obtener estadísticas globales
 */
export function getGlobalFilterStats() {
  return globalBloomFilter ? globalBloomFilter.getStatistics() : null;
}
