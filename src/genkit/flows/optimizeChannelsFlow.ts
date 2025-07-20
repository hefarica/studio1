import { ai } from '../config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const optimizeChannelsFlow = ai.defineFlow(
  {
    name: 'optimizeChannelsFlow',
    inputSchema: z.object({
      channels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        category: z.string(),
        logo: z.string().optional(),
        serverId: z.string()
      })),
      optimizationType: z.enum(['deduplication', 'categorization', 'quality', 'naming']).default('deduplication'),
      preferences: z.object({
        language: z.string().default('es'),
        region: z.string().default('CO'),
        includeAdultContent: z.boolean().default(false),
        preferredQuality: z.enum(['SD', 'HD', '4K', 'any']).default('HD')
      }).optional()
    }),
    outputSchema: z.object({
      optimizedChannels: z.array(z.object({
        id: z.string(),
        originalName: z.string(),
        optimizedName: z.string(),
        category: z.string(),
        suggestedCategory: z.string(),
        quality: z.string(),
        isDuplicate: z.boolean(),
        duplicateOf: z.string().optional(),
        confidence: z.number().min(0).max(100)
      })),
      statistics: z.object({
        totalChannels: z.number(),
        duplicatesFound: z.number(),
        categoriesOptimized: z.number(),
        qualityIssues: z.number(),
        namingIssues: z.number()
      }),
      recommendations: z.array(z.string()),
      categories: z.array(z.object({
        name: z.string(),
        channelCount: z.number(),
        suggested: z.boolean()
      }))
    })
  },
  async ({ channels, optimizationType, preferences = {} }) => {
    const { language = 'es', region = 'CO', includeAdultContent = false, preferredQuality = 'HD' } = preferences;

    // Analizar canales con IA
    const channelSample = channels.slice(0, 50).map(ch => 
      `"${ch.name}" (ID: ${ch.id}, Categoría: ${ch.category})`
    ).join('\n');

    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Eres un experto en optimización de contenido IPTV para Ingenio Pichichi S.A. en Colombia.

TAREA: Optimizar lista de ${channels.length} canales IPTV

TIPO DE OPTIMIZACIÓN: ${optimizationType}
IDIOMA: ${language}
REGIÓN: ${region}
INCLUIR CONTENIDO ADULTO: ${includeAdultContent ? 'Sí' : 'No'}
CALIDAD PREFERIDA: ${preferredQuality}

MUESTRA DE CANALES (primeros 50):
${channelSample}

INSTRUCCIONES ESPECÍFICAS POR TIPO:

${optimizationType === 'deduplication' ? `
DEDUPLICACIÓN:
- Identifica canales duplicados con nombres similares
- Considera variaciones como "ESPN", "ESPN HD", "ESPN Colombia"
- Detecta sufijos comunes: HD, FHD, 4K, CO, MX, AR, etc.
- Agrupa por similitud de contenido, no solo por nombre exacto
` : ''}

${optimizationType === 'categorization' ? `
CATEGORIZACIÓN:
- Reorganiza canales en categorías lógicas para usuarios colombianos
- Categorías sugeridas: Nacionales, Deportes, Noticias, Entretenimiento, Infantiles, Películas, Series, Documentales, Música
- Considera canales locales colombianos como prioritarios
` : ''}

${optimizationType === 'quality' ? `
CALIDAD:
- Identifica marcadores de calidad en nombres: SD, HD, FHD, 4K, UHD
- Prioriza según preferencia: ${preferredQuality}
- Detecta posibles problemas de transmisión por patrones en nombres
` : ''}

${optimizationType === 'naming' ? `
NOMENCLATURA:
- Estandariza nombres de canales
- Elimina caracteres especiales innecesarios
- Unifica formato: "Nombre Canal HD" o "Canal Nombre 4K"
- Mantén identificadores regionales importantes (CO, COL, Colombia)
` : ''}

Responde con un análisis detallado y recomendaciones específicas para el mercado colombiano.`,
    });

    // Procesar canales con lógica de optimización
    const optimizedChannels = await processChannelsOptimization(channels, optimizationType, preferences);

    // Calcular estadísticas
    const statistics = {
      totalChannels: channels.length,
      duplicatesFound: optimizedChannels.filter(ch => ch.isDuplicate).length,
      categoriesOptimized: [...new Set(optimizedChannels.map(ch => ch.suggestedCategory))].length,
      qualityIssues: optimizedChannels.filter(ch => !ch.quality || ch.quality === 'unknown').length,
      namingIssues: optimizedChannels.filter(ch => 
        ch.originalName !== ch.optimizedName
      ).length
    };

    // Generar recomendaciones
    const recommendations = generateOptimizationRecommendations(statistics, optimizationType);

    // Generar categorías sugeridas
    const categoryMap = new Map<string, number>();
    optimizedChannels.forEach(ch => {
      const category = ch.suggestedCategory;
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const categories = Array.from(categoryMap.entries()).map(([name, channelCount]) => ({
      name,
      channelCount,
      suggested: !['Otros', 'Sin Categoría', 'General'].includes(name)
    })).sort((a, b) => b.channelCount - a.channelCount);

    return {
      optimizedChannels,
      statistics,
      recommendations,
      categories
    };
  }
);

// Funciones auxiliares para procesamiento
async function processChannelsOptimization(channels: any[], type: string, preferences: any) {
  const optimized = [];

  for (const channel of channels) {
    const optimizedChannel = {
      id: channel.id,
      originalName: channel.name,
      optimizedName: channel.name,
      category: channel.category,
      suggestedCategory: channel.category,
      quality: extractQuality(channel.name),
      isDuplicate: false,
      duplicateOf: undefined as string | undefined,
      confidence: 95
    };

    switch (type) {
      case 'deduplication':
        const duplicate = findDuplicate(channel, channels);
        if (duplicate) {
          optimizedChannel.isDuplicate = true;
          optimizedChannel.duplicateOf = duplicate.id;
        }
        break;

      case 'categorization':
        optimizedChannel.suggestedCategory = categorizeChannel(channel.name);
        break;

      case 'quality':
        optimizedChannel.quality = extractQuality(channel.name);
        break;

      case 'naming':
        optimizedChannel.optimizedName = standardizeName(channel.name);
        break;
    }

    optimized.push(optimizedChannel);
  }

  return optimized;
}

function extractQuality(name: string): string {
  if (/4K|UHD|Ultra/i.test(name)) return '4K';
  if (/FHD|Full.*HD/i.test(name)) return 'FHD';
  if (/HD|High/i.test(name)) return 'HD';
  if (/SD|Standard/i.test(name)) return 'SD';
  return 'unknown';
}

function findDuplicate(channel: any, allChannels: any[]) {
  const normalized = channel.name.toLowerCase()
    .replace(/\s*(hd|fhd|4k|sd|co|colombia|mx|ar)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '');
  
  return allChannels.find(other => 
    other.id !== channel.id && 
    other.name.toLowerCase()
      .replace(/\s*(hd|fhd|4k|sd|co|colombia|mx|ar)\s*/gi, '')
      .replace(/[^a-z0-9]/g, '') === normalized
  );
}

function categorizeChannel(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (/espn|fox.*sports|win.*sports|directv.*sports/i.test(name)) return 'Deportes';
  if (/noticias|news|cnn|bbc/i.test(name)) return 'Noticias';
  if (/cartoon|disney|nick|infantil|kids/i.test(name)) return 'Infantiles';
  if (/cine|movies|cinema|film/i.test(name)) return 'Películas';
  if (/caracol|rcn|canal.*uno|telecaribe/i.test(name)) return 'Nacionales Colombia';
  if (/discovery|history|natgeo|animal/i.test(name)) return 'Documentales';
  if (/mtv|music|radio/i.test(name)) return 'Música';
  
  return 'Entretenimiento';
}

function standardizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\b(hd|fhd|4k|sd)\b/gi, match => match.toUpperCase());
}

function generateOptimizationRecommendations(stats: any, type: string): string[] {
  const recommendations = [];
  
  if (stats.duplicatesFound > 0) {
    recommendations.push(`Eliminar ${stats.duplicatesFound} canales duplicados para optimizar el listado`);
  }
  
  if (stats.qualityIssues > 0) {
    recommendations.push(`Revisar ${stats.qualityIssues} canales sin indicador de calidad`);
  }
  
  if (stats.namingIssues > 0) {
    recommendations.push(`Estandarizar nombres de ${stats.namingIssues} canales`);
  }
  
  recommendations.push('Implementar sistema de monitoreo de calidad de streams');
  recommendations.push('Configurar categorías automáticas para nuevos canales');
  recommendations.push('Establecer políticas de naming consistency');
  
  return recommendations;
}
