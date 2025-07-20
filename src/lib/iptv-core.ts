import type { IPTVServer } from './types';

/**
 * Provides a client-side SDK to interact with the IPTV backend API routes.
 * This class simplifies making requests from the UI components.
 */
export class IPTVCore {
  
  /**
   * Tests the connection to a given IPTV server by calling the backend API.
   * @param server The server configuration to test.
   * @returns A promise that resolves with the test result.
   */
  async testServerConnection(server: IPTVServer) {
    this.log(`[CORE] Testing connection for: ${server.name}`);
    try {
      const response = await fetch('/api/iptv/servers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.log(`[CORE] Test successful for ${server.name}: ${result.data.protocol}`, 'success');
      return result;
      
    } catch (error: any) {
      this.log(`[CORE] Network error testing ${server.name}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiates a full scan of a server by calling the backend API.
   * @param server The server to scan.
   * @returns A promise that resolves with the scan result.
   */
  async scanServer(server: IPTVServer) {
     this.log(`[CORE] Initiating full scan for: ${server.name}`);
    try {
      const response = await fetch('/api/iptv/scan-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse scan error response' }));
        throw new Error(errorData.error || `Scan API error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        this.log(`[CORE] Scan successful for ${server.name}: ${result.results.totalChannels} channels`, 'success');
      } else {
        this.log(`[CORE] Scan failed for ${server.name}: ${result.error}`, 'error');
      }
      return result;

    } catch (error: any) {
      this.log(`[CORE] Network error scanning ${server.name}: ${error.message}`, 'error');
      return { success: false, error: error.message, results: null };
    }
  }

  /**
   * A simple internal logger that outputs to the console.
   * @param message The message to log.
   * @param level The log level.
   */
  private log(message: string, level: 'info' | 'error' | 'success' = 'info') {
    const prefix = {
      info: 'ℹ️',
      error: '❌',
      success: '✅',
    }[level];
    console.log(`${prefix} ${message}`);
  }

  /**
   * Detects the IPTV protocol based on the server's response data.
   * @param data The response from the server.
   * @returns The detected protocol name.
   */
  detectProtocol(data: any): string {
    if (data?.server_info && data?.user_info) return 'Xtream Codes';
    if (typeof data === 'string' && data.includes('#EXTINF')) return 'M3U Plus';
    if (Array.isArray(data)) return 'Panel API';
    return 'Desconocido';
  }
}
