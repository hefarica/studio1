// This file is now primarily for type definitions and can be moved/renamed.
// The core logic is now inside the API routes and the main component.

import { CONFIG } from './constants';

export class IPTVCore extends EventTarget {
  constructor() {
    super();
    this.scanning = false;
  }

  addLog(message, level = 'info') {
    this.dispatchEvent(new CustomEvent('log', { detail: { message, level } }));
  }

  async testServerConnection(server) {
    try {
      this.addLog(`Probando conexión: ${server.name}`, 'info');
      
      const response = await fetch('/api/iptv/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: server.url, username: server.username, password: server.password })
      });

      const result = await response.json();

      if (result.success) {
        this.addLog(`✅ ${server.name}: Conexión exitosa`, 'success');
        return { success: true, protocol: this.detectProtocol(result.data) };
      } else {
        this.addLog(`❌ ${server.name}: ${result.error}`, 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.addLog(`💥 Error de red probando ${server.name}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async scanServer(server) {
    try {
      const response = await fetch('/api/iptv/scan-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server })
      });

      const result = await response.json();
      
      if (result.success) {
        this.addLog(`[SCAN] ${server.name} completado: ${result.results.totalChannels} canales`, 'success');
      } else {
        this.addLog(`[SCAN] Error escaneando ${server.name}: ${result.error}`, 'error');
      }
      return result;

    } catch (error) {
      this.addLog(`💥 Error de red escaneando ${server.name}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  detectProtocol(data) {
    if (data?.server_info && data?.user_info) return 'Xtream Codes';
    if (typeof data === 'string' && data.includes('#EXTINF')) return 'M3U Plus';
    if (Array.isArray(data)) return 'Panel API';
    return 'Desconocido';
  }
}
