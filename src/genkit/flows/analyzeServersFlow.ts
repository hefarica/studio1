import { ai } from '../config';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const analyzeServersFlow = ai.defineFlow(
  {
    name: 'analyzeServersFlow',
    inputSchema: z.object({
      servers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        channels: z.number(),
        totalChannels: z.number(),
        categories: z.array(z.object({
          category_id: z.string(),
          category_name: z.string()
        })),
        protocol: z.string().nullable(),
        status: z.enum(['idle', 'scanning', 'connected', 'completed', 'error', 'retrying']),
        lastScan: z.string().nullable(),
        errors: z.array(z.string()).optional()
      })),
      analysisType: z.enum(['performance', 'health', 'optimization', 'troubleshooting']).default('performance')
    }),
    outputSchema: z.object({
      analysis: z.string(),
      recommendations: z.array(z.string()),
      healthScore: z.number().min(0).max(100),
      issues: z.array(z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        title: z.string(),
        description: z.string(),
        solution: z.string()
      })),
      optimizations: z.array(z.string()),
      summary: z.object({
        totalServers: z.number(),
        connectedServers: z.number(),
        totalChannels: z.number(),
        averageChannelsPerServer: z.number(),
        protocolDistribution: z.record(z.number())
      })
    }),
  },
  async ({ servers, analysisType }) => {
    const serversData = servers.map(s => 
      `- ${s.name}: ${s.totalChannels} canales, Protocolo: ${s.protocol || 'Desconocido'}, Estado: ${s.status}, Última actualización: ${s.lastScan || 'Nunca'}`
    ).join('\n');

    const errorServers = servers.filter(s => s.status === 'error');
    const connectedServers = servers.filter(s => s.status === 'connected' || s.status === 'completed');
    const totalChannels = servers.reduce((sum, s) => sum + s.totalChannels, 0);
    const avgChannels = servers.length > 0 ? Math.round(totalChannels / servers.length) : 0;

    const contextPrompt = analysisType === 'troubleshooting' ? 
      `MODO DIAGNÓSTICO - Enfócate en identificar y resolver problemas específicos de conectividad IPTV.` :
      `MODO ANÁLISIS GENERAL - Evalúa el rendimiento y la salud general del sistema IPTV.`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `Eres un experto en sistemas IPTV trabajando para Ingenio Pichichi S.A. 

${contextPrompt}

Analiza estos servidores IPTV del Constructor Studio1:

ESTADÍSTICAS GENERALES:
- Total de servidores: ${servers.length}
- Servidores conectados: ${connectedServers.length}
- Servidores con errores: ${errorServers.length}
- Total de canales: ${totalChannels.toLocaleString()}
- Promedio por servidor: ${avgChannels.toLocaleString()} canales

DETALLE DE SERVIDORES:
${serversData}

${errorServers.length > 0 ? `
SERVIDORES CON PROBLEMAS:
${errorServers.map(s => `- ${s.name}: ${s.errors?.join(', ') || 'Error desconocido'}`).join('\n')}
` : ''}

INSTRUCCIONES:
1. Proporciona un análisis técnico detallado y profesional
2. Identifica problemas específicos (Error 512, respuestas inesperadas, timeouts)
3. Da recomendaciones específicas para optimización
4. Calcula un puntaje de salud del sistema (0-100)
5. Prioriza soluciones por impacto y facilidad de implementación
6. Considera las mejores prácticas para sistemas IPTV empresariales

Responde en español y mantén un tono técnico profesional apropiado para el Ingenio Pichichi S.A.`,
    });

    // Parsear y estructurar la respuesta
    const lines = text.split('\n').filter(line => line.trim());
    
    // Extraer análisis general
    const analysisStart = lines.findIndex(line => line.toLowerCase().includes('análisis'));
    const recommendationsStart = lines.findIndex(line => line.toLowerCase().includes('recomendac'));
    
    const analysis = lines.slice(analysisStart, recommendationsStart > -1 ? recommendationsStart : analysisStart + 10)
      .join('\n') || 'Análisis completado satisfactoriamente.';

    // Generar recomendaciones inteligentes
    const recommendations = [];
    
    if (errorServers.length > 0) {
      recommendations.push(`Resolver ${errorServers.length} servidor(es) con problemas de conectividad`);
      recommendations.push('Implementar sistema de monitoreo automático para detección temprana de fallas');
    }
    
    if (connectedServers.length < servers.length * 0.8) {
      recommendations.push('Mejorar la tasa de conectividad - objetivo: >80% de servidores operativos');
    }
    
    if (totalChannels < servers.length * 1000) {
      recommendations.push('Optimizar configuración de servidores para maximizar canales disponibles');
    }
    
    recommendations.push('Configurar respaldos automáticos de configuraciones de servidores');
    recommendations.push('Implementar alertas proactivas para errores 512 y timeouts');

    // Calcular puntaje de salud
    let healthScore = 100;
    
    // Penalizar por servidores desconectados
    healthScore -= (errorServers.length / servers.length) * 40;
    
    // Penalizar por bajo número de canales
    if (avgChannels < 1000) healthScore -= 20;
    else if (avgChannels < 5000) healthScore -= 10;
    
    // Bonificar por diversidad de protocolos
    const protocols = [...new Set(servers.map(s => s.protocol).filter(Boolean))];
    if (protocols.length > 1) healthScore += 5;
    
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Identificar issues críticos
    const issues = [];
    
    errorServers.forEach(server => {
      issues.push({
        severity: 'high' as const,
        title: `Servidor ${server.name} desconectado`,
        description: `El servidor presenta problemas de conectividad y no puede procesar canales`,
        solution: 'Verificar credenciales, URL y conectividad de red. Revisar logs para errores específicos.'
      });
    });

    if (totalChannels === 0 && servers.length > 0) {
      issues.push({
        severity: 'critical' as const,
        title: 'Sin canales disponibles',
        description: 'Ningún servidor está proporcionando canales al sistema',
        solution: 'Verificar configuración de todos los servidores y ejecutar escaneo completo'
      });
    }

    // Calcular distribución de protocolos
    const protocolDistribution: Record<string, number> = {};
    servers.forEach(server => {
      const protocol = server.protocol || 'Desconocido';
      protocolDistribution[protocol] = (protocolDistribution[protocol] || 0) + 1;
    });

    // Generar optimizaciones
    const optimizations = [
      'Configurar cache inteligente para mejorar tiempos de respuesta',
      'Implementar balanceador de carga para distribuir consultas',
      'Optimizar timeouts basados en latencia promedio de cada servidor',
      'Configurar retry automático con backoff exponencial',
      'Implementar métricas de rendimiento en tiempo real'
    ];

    return {
      analysis,
      recommendations,
      healthScore,
      issues,
      optimizations,
      summary: {
        totalServers: servers.length,
        connectedServers: connectedServers.length,
        totalChannels,
        averageChannelsPerServer: avgChannels,
        protocolDistribution
      }
    };
  }
);
