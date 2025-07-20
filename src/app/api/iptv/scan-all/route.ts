import { NextRequest, NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';
import { CONFIG } from '@/lib/constants';
import { IPTVServer, ScanResult } from '@/lib/types';

// Store active scans
const activeScans = new Map<string, {
  servers: IPTVServer[];
  progress: any;
  abortController: AbortController;
}>();

export async function POST(request: NextRequest) {
  try {
    const { serverIds, scanId, config = {} } = await request.json();
    
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere al menos un servidor para escanear',
        code: 'NO_SERVERS'
      }, { status: 400 });
    }

    // Obtener servidores (normalmente desde DB, aquí simulamos)
    const servers = getServersById(serverIds);
    
    if (servers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron servidores válidos',
        code: 'SERVERS_NOT_FOUND'
      }, { status: 404 });
    }

    const finalScanId = scanId || `scan_${Date.now()}`;
    const abortController = new AbortController();
    
    // Almacenar scan activo
    activeScans.set(finalScanId, {
      servers,
      progress: {
        current: 0,
        total: servers.length,
        percentage: 0,
        startTime: Date.now(),
        channelsFound: 0
      },
      abortController
    });

    console.log(`🚀 [SCAN-ALL] Iniciando escaneo masivo: ${servers.length} servidores`);

    // Iniciar escaneo asíncrono
    scanServersAsync(finalScanId, servers, config).catch(error => {
      console.error(`💥 [SCAN-ALL] Error en escaneo ${finalScanId}:`, error);
    });

    return NextResponse.json({
      success: true,
      scanId: finalScanId,
      serversCount: servers.length,
      message: `Escaneo iniciado para ${servers.length} servidor(es)`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SCAN-ALL] Error inesperado:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      originalError: error.message
    }, { status: 500 });
  }
}

async function scanServersAsync(scanId: string, servers: IPTVServer[], config: any) {
  const scanData = activeScans.get(scanId);
  if (!scanData) return;

  const { abortController } = scanData;
  const iptvCore = new IPTVCore();
  const results: ScanResult[] = [];
  let totalChannelsFound = 0;

  try {
    for (let i = 0; i < servers.length; i++) {
      if (abortController.signal.aborted) {
        console.log(`⏹️ [SCAN-ALL] Escaneo ${scanId} cancelado`);
        break;
      }

      const server = servers[i];
      console.log(`[SCAN ${i + 1}/${servers.length}] Procesando: ${server.name}`);

      // Actualizar progreso
      const progress = {
        current: i + 1,
        total: servers.length,
        percentage: ((i + 1) / servers.length) * 100,
        currentServer: server.name,
        channelsFound: totalChannelsFound
      };

      updateScanProgress(scanId, progress);

      try {
        // Escanear servidor con manejo de errores
        const result: {success: boolean, results?: { totalChannels: number, categories: any[]}, error?: string} = await IPTVErrorHandler.handleRetry(
          async () => {
            return await iptvCore.scanServer(
              server
            );
          },
          { 
            serverName: server.name, 
            operationType: 'full_scan' 
          },
          3 // máximo 3 intentos para escaneo completo
        );

        if (result.success && result.results) {
          const scanResult: ScanResult = {
            success: true,
            channels: result.results.totalChannels,
            categories: result.results.categories.length,
            errors: [],
            duration: 0, // Placeholder
            serverId: server.id
          };
          results.push(scanResult);
          totalChannelsFound += scanResult.channels;

          console.log(`✅ [SCAN] ${server.name}: ${scanResult.channels} canales`);

          // Notificar servidor completado
          notifyServerCompleted(scanId, scanResult);
        } else {
            throw new Error(result.error || 'Unknown scan error');
        }


      } catch (serverError: any) {
        const errorResult: ScanResult = {
          success: false,
          channels: 0,
          categories: 0,
          errors: [serverError.message],
          duration: 0,
          serverId: server.id
        };

        results.push(errorResult);
        console.error(`❌ [SCAN] ${server.name} falló: ${serverError.message}`);

        // Notificar error del servidor
        notifyServerCompleted(scanId, errorResult);
      }

      // Pausa entre servidores para no sobrecargar
      if (i < servers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Notificar escaneo completado
    const finalProgress = {
      current: servers.length,
      total: servers.length,
      percentage: 100,
      channelsFound: totalChannelsFound
    };

    updateScanProgress(scanId, finalProgress);
    notifyScanCompleted(scanId, {
      totalServers: servers.length,
      successfulScans: results.filter(r => r.success).length,
      failedScans: results.filter(r => !r.success).length,
      totalChannels: totalChannelsFound,
      duration: Date.now() - (scanData.progress.startTime || Date.now())
    });

    console.log(`🎉 [SCAN-ALL] Escaneo ${scanId} completado: ${totalChannelsFound} canales`);

  } catch (error: any) {
    console.error(`💥 [SCAN-ALL] Error crítico en escaneo ${scanId}:`, error);
    notifyScanError(scanId, error.message);
  } finally {
    // Limpiar scan activo
    activeScans.delete(scanId);
  }
}

// Helper functions (implementación simplificada)
function getServersById(serverIds: string[]): IPTVServer[] {
  // En implementación real, obtener desde base de datos
  // Por ahora simulamos datos
  return serverIds.map((id, index) => ({
    id,
    name: `Servidor ${id}`,
    url: `http://example${index + 1}.com:8080`,
    username: `user${index + 1}`,
    password: `pass${index + 1}`,
    channels: 0,
    lastScan: null,
    status: 'idle' as const,
    protocol: null,
    categories: [],
    totalChannels: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
}

function updateScanProgress(scanId: string, progress: any) {
  // En implementación real, usar WebSockets o Server-Sent Events
  console.log(`📊 [PROGRESS] ${scanId}: ${progress.percentage.toFixed(1)}%`);
}

function notifyServerCompleted(scanId: string, result: ScanResult) {
  console.log(`📡 [SERVER-DONE] ${scanId}: ${result.serverId} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
}

function notifyScanCompleted(scanId: string, summary: any) {
  console.log(`🎯 [SCAN-COMPLETE] ${scanId}:`, summary);
}

function notifyScanError(scanId: string, error: string) {
  console.error(`💥 [SCAN-ERROR] ${scanId}: ${error}`);
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const scanId = url.searchParams.get('scanId');
    
    if (!scanId) {
      return NextResponse.json({
        success: false,
        error: 'scanId es requerido'
      }, { status: 400 });
    }

    const scanData = activeScans.get(scanId);
    if (scanData) {
      scanData.abortController.abort();
      activeScans.delete(scanId);
      
      console.log(`⏹️ [SCAN-CANCEL] Escaneo ${scanId} cancelado`);
      
      return NextResponse.json({
        success: true,
        message: `Escaneo ${scanId} cancelado correctamente`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Escaneo no encontrado o ya completado'
      }, { status: 404 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
