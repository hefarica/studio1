/**
 * Analizador Holístico de Contenido IPTV (M3U)
 * Extrae metadatos detallados de listas de canales con alta precisión.
 */

export interface ChannelMetadata {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  quality?: string;
  reliability: number; // 0 a 1
}

export class IPTVHolisticAnalyzer {
  
  /**
   * Analiza contenido M3U y lo convierte en una estructura de metadatos.
   */
  public async analyzeM3UContent(
    m3uContent: string,
    baseUrl: string
  ): Promise<ChannelMetadata[]> {
    if (!m3uContent || !m3uContent.startsWith('#EXTM3U')) {
      throw new Error('Contenido M3U inválido o no soportado');
    }

    const lines = m3uContent.split('\n');
    const channels: ChannelMetadata[] = [];
    let currentChannel: Partial<ChannelMetadata> = {};

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        currentChannel = this.parseExtInfLine(line);
      } else if (line.trim() && !line.startsWith('#')) {
        currentChannel.url = this.normalizeUrl(line.trim(), baseUrl);
        
        if (currentChannel.name && currentChannel.url) {
            currentChannel.id = this.generateStableId(currentChannel.name, currentChannel.url);
            currentChannel.quality = this.extractQualityFromName(currentChannel.name);
            currentChannel.reliability = 0.85; // Default reliability
            channels.push(currentChannel as ChannelMetadata);
        }
        currentChannel = {}; // Reset for next channel
      }
    }

    return channels;
  }

  /**
   * Parsea la línea #EXTINF y extrae los metadatos.
   */
  private parseExtInfLine(line: string): Partial<ChannelMetadata> {
    const metadata: Partial<ChannelMetadata> = {};
    const mainPart = line.substring(line.indexOf(',') + 1);

    // Extract attributes like tvg-id, tvg-logo, group-title
    const attributes = line.match(/([a-zA-Z0-9-]+)="([^"]*)"/g) || [];
    attributes.forEach(attr => {
      const [key, value] = attr.replace(/"/g, '').split('=');
      switch (key) {
        case 'tvg-id':
          metadata.tvgId = value;
          break;
        case 'tvg-logo':
          metadata.logo = value;
          break;
        case 'group-title':
          metadata.group = value;
          break;
        case 'tvg-name':
            metadata.tvgName = value;
            break;
      }
    });

    metadata.name = mainPart.trim();
    return metadata;
  }
  
  /**
   * Genera un ID estable para un canal basado en su nombre y URL.
   */
  private generateStableId(name: string, url: string): string {
    let hash = 0;
    const str = `${name}|${url}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Extrae la calidad del video desde el nombre del canal.
   */
  private extractQualityFromName(name: string): string {
    const lowerName = name.toLowerCase();
    if (/\b(4k|uhd|2160p)\b/.test(lowerName)) return '4K';
    if (/\b(fhd|1080p)\b/.test(lowerName)) return '1080p';
    if (/\b(hd|720p)\b/.test(lowerName)) return '720p';
    if (/\b(sd|576p|480p)\b/.test(lowerName)) return 'SD';
    return 'Unknown';
  }

  /**
   * Normaliza una URL, resolviéndola si es relativa.
   */
  private normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    try {
        return new URL(url, baseUrl).toString();
    } catch {
        return url; // Fallback if base is also invalid
    }
  }
}
