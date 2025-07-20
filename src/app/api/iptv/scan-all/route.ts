import { NextRequest, NextResponse } from 'next/server';
import { IPTVCore } from '@/lib/iptv-core';
import { IPTVErrorHandler } from '@/lib/error-handler';
import { CONFIG } from '@/lib/constants';
import { IPTVServer, ScanProgress, ScanResult } from '@/lib/types';

// Store active scans in memory
export const activeScans = new Map<string, {
  servers: IPTVServer[];
  progress: ScanProgress;
  results: ScanResult[];
  abortController: AbortController;
}>();

export async function POST(request: NextRequest) {
  try {
    const { serverIds, scanId: providedScanId, config = {} } = await request.json();
    
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere al menos un servidor para escanear',
        code: 'NO_SERVERS'
      }, { status: 400 });
    }

    // This is a simplified server retrieval. In a real app, this would come from a database.
    const servers = getServersById(serverIds);
    
    if (servers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron servidores válidos',
        code: 'SERVERS_NOT_FOUND'
      }, { status: 404 });
    }

    const scanId = providedScanId || `scan_${Date.now()}`;
    const abortController = new AbortController();
    
    // Store the active scan details
    activeScans.set(scanId, {
      servers,
      progress: {
        current: 0,
        total: servers.length,
        percentage: 0,
        startTime: Date.now(),
        channelsFound: 0,
        eta: null,
      },
      results: [],
      abortController
    });

    console.log(`🚀 [SCAN-ALL] Initiating scan for ${servers.length} servers with ID: ${scanId}`);

    // Start the scan asynchronously. Do not `await` this call.
    scanServersAsync(scanId, servers, config).catch(error => {
      console.error(`💥 [SCAN-ALL] Uncaught error in async scan ${scanId}:`, error);
      const scanData = activeScans.get(scanId);
      if (scanData) {
        scanData.progress.percentage = 100; // Mark as complete to stop polling
        scanData.progress.eta = 0;
      }
    });

    return NextResponse.json({
      success: true,
      scanId: scanId,
      serversCount: servers.length,
      message: `Escaneo iniciado para ${servers.length} servidor(es)`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SCAN-ALL] Unexpected error:', error);
    
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
  let totalChannelsFound = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < servers.length; i++) {
      if (abortController.signal.aborted) {
        console.log(`⏹️ [SCAN-ALL] Scan ${scanId} was cancelled.`);
        break;
      }

      const server = servers[i];
      updateScanProgress(scanId, { currentServer: server.name });

      try {
        const result = await IPTVErrorHandler.handleRetry(
          () => iptvCore.scanServer(server),
          { serverName: server.name, operationType: 'full_scan' },
          3 // Max 3 retries for a full scan
        );
        
        const scanResult: ScanResult = {
          success: result.success,
          channels: result.success ? result.results.totalChannels : 0,
          categories: result.success ? result.results.categories.length : 0,
          errors: result.success ? [] : [result.error || 'Unknown scan error'],
          duration: 0, // Placeholder, will be calculated later
          serverId: server.id
        };
        
        scanData.results.push(scanResult);
        if (scanResult.success) {
          totalChannelsFound += scanResult.channels;
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
        scanData.results.push(errorResult);
        console.error(`❌ [SCAN] ${server.name} failed: ${serverError.message}`);
      }

      // Update progress after each server
      const elapsedTime = Date.now() - startTime;
      const avgTimePerServer = elapsedTime / (i + 1);
      const remainingServers = servers.length - (i + 1);
      const eta = avgTimePerServer * remainingServers;

      updateScanProgress(scanId, {
        current: i + 1,
        percentage: ((i + 1) / servers.length) * 100,
        channelsFound: totalChannelsFound,
        eta: Math.round(eta)
      });
      
      if (i < servers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Finalize scan
    updateScanProgress(scanId, {
      percentage: 100,
      eta: 0,
      currentServer: undefined,
    });
    console.log(`🎉 [SCAN-ALL] Scan ${scanId} completed. Found ${totalChannelsFound} total channels.`);

  } catch (error: any) {
    console.error(`💥 [SCAN-ALL] Critical error during scan ${scanId}:`, error);
    updateScanProgress(scanId, { percentage: 100, eta: 0 }); // Mark as complete
  } finally {
    // Keep data for a while so client can fetch final results
    setTimeout(() => {
        activeScans.delete(scanId);
        console.log(`[SCAN-ALL] Cleaned up scan data for ${scanId}`);
    }, 300000); // 5 minutes
  }
}

// Helper function to get server details by ID. Replace with your actual data source.
function getServersById(serverIds: string[]): IPTVServer[] {
  return serverIds.map((id, index) => ({
    id,
    name: `EVESTV`,
    url: `http://126954339934.d4ktv.info:80`,
    username: `uqb3fbu3b`,
    password: `63524`,
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

function updateScanProgress(scanId: string, progressUpdate: Partial<ScanProgress>) {
  const scanData = activeScans.get(scanId);
  if (scanData) {
    scanData.progress = { ...scanData.progress, ...progressUpdate };
    // console.log(`📊 [PROGRESS] ${scanId}: ${scanData.progress.percentage.toFixed(1)}%`);
  }
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
      
      console.log(`⏹️ [SCAN-CANCEL] Scan ${scanId} cancelled by request.`);
      
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
