
/**
 * Rastreador Holístico de Progreso para Escaneo IPTV
 * Sistema granular que refleja cada operación en segundo plano en tiempo real
 */

export interface ProgressPhase {
  id: string;
  name: string;
  weight: number; // Porcentaje del progreso total (0-100)
  currentStep: number;
  totalSteps: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedDuration: number; // en milisegundos
  actualDuration?: number;
}

export interface ProgressMetrics {
  totalProgress: number; // 0-100
  channelsFound: number;
  serversProcessed: number;
  timeElapsed: number;
  timeEstimated: number;
  velocity: number; // canales por minuto
  processedPercentage: number;
  currentPhase: string;
  throughput: number;
}

export interface ProgressEvent {
  type: 'phase_start' | 'phase_progress' | 'phase_complete' | 'metrics_update' | 'error';
  phase?: ProgressPhase;
  metrics: ProgressMetrics;
  message?: string;
  timestamp: number;
}

export class IPTVProgressTracker {
  private phases: Map<string, ProgressPhase>;
  private metrics: ProgressMetrics;
  private startTime: number;
  private lastUpdateTime: number;
  private progressCallbacks: ((event: ProgressEvent) => void)[];
  private heuristicEstimator: HeuristicEstimator;
  private channelBuffer: number[];
  private updateInterval: NodeJS.Timeout | null;

  constructor() {
    this.phases = new Map();
    this.progressCallbacks = [];
    this.channelBuffer = [];
    this.updateInterval = null;
    this.heuristicEstimator = new HeuristicEstimator();
    
    this.initializeProgressPhases();
    this.initializeMetrics();
    this.startTime = 0;
    this.lastUpdateTime = 0;
  }

  /**
   * Inicialización de fases de progreso holístico
   */
  private initializeProgressPhases(): void {
    const progressPhases: ProgressPhase[] = [
      {
        id: 'connection_setup',
        name: 'Configurando Conexión',
        weight: 10,
        currentStep: 0,
        totalSteps: 5,
        status: 'pending',
        estimatedDuration: 3000 // 3 segundos
      },
      {
        id: 'server_authentication',
        name: 'Autenticando Servidor',
        weight: 15,
        currentStep: 0,
        totalSteps: 4,
        status: 'pending',
        estimatedDuration: 5000 // 5 segundos
      },
      {
        id: 'channel_discovery',
        name: 'Descubriendo Canales',
        weight: 25,
        currentStep: 0,
        totalSteps: 10,
        status: 'pending',
        estimatedDuration: 15000 // 15 segundos
      },
      {
        id: 'data_extraction',
        name: 'Extrayendo Datos',
        weight: 30,
        currentStep: 0,
        totalSteps: 20,
        status: 'pending',
        estimatedDuration: 20000 // 20 segundos
      },
      {
        id: 'duplicate_filtering',
        name: 'Filtrando Duplicados',
        weight: 10,
        currentStep: 0,
        totalSteps: 5,
        status: 'pending',
        estimatedDuration: 8000 // 8 segundos
      },
      {
        id: 'metadata_enrichment',
        name: 'Enriqueciendo Metadatos',
        weight: 7,
        currentStep: 0,
        totalSteps: 3,
        status: 'pending',
        estimatedDuration: 5000 // 5 segundos
      },
      {
        id: 'final_optimization',
        name: 'Optimización Final',
        weight: 3,
        currentStep: 0,
        totalSteps: 2,
        status: 'pending',
        estimatedDuration: 2000 // 2 segundos
      }
    ];

    progressPhases.forEach(phase => {
      this.phases.set(phase.id, phase);
    });
  }

  /**
   * Inicialización de métricas de progreso
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalProgress: 0,
      channelsFound: 0,
      serversProcessed: 0,
      timeElapsed: 0,
      timeEstimated: 0,
      velocity: 0,
      processedPercentage: 0,
      currentPhase: 'Preparando escaneo...',
      throughput: 0
    };
  }

  /**
   * Inicio del tracking de progreso holístico
   */
  public startTracking(): void {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    
    // Actualización continua cada 500ms para suavidad visual
    this.updateInterval = setInterval(() => {
      this.updateProgressMetrics();
    }, 500);

    this.emitProgressEvent('phase_start', undefined, 'Iniciando escaneo holístico...');
  }

  /**
   * Avance de fase específica con granularidad
   */
  public advancePhase(
    phaseId: string, 
    stepIncrement: number = 1, 
    additionalData?: { channelsFound?: number; message?: string }
  ): void {
    const phase = this.phases.get(phaseId);
    if (!phase) return;

    // Activar fase si no estaba activa
    if (phase.status === 'pending') {
      phase.status = 'active';
      this.emitProgressEvent('phase_start', phase, `Iniciando: ${phase.name}`);
    }

    // Avanzar pasos de la fase
    phase.currentStep = Math.min(phase.currentStep + stepIncrement, phase.totalSteps);

    // Actualizar métricas si se proporcionan
    if (additionalData?.channelsFound) {
      this.metrics.channelsFound += additionalData.channelsFound;
      this.channelBuffer.push(additionalData.channelsFound);
      
      // Mantener buffer de últimos 10 valores para cálculo de velocidad
      if (this.channelBuffer.length > 10) {
        this.channelBuffer.shift();
      }
    }

    // Completar fase si alcanzó todos los pasos
    if (phase.currentStep >= phase.totalSteps) {
      phase.status = 'completed';
      phase.actualDuration = Date.now() - this.startTime;
      this.emitProgressEvent('phase_complete', phase, `Completado: ${phase.name}`);
    } else {
      this.emitProgressEvent('phase_progress', phase, additionalData?.message);
    }

    this.updateProgressMetrics();
  }

  /**
   * Actualización holística de métricas de progreso
   */
  private updateProgressMetrics(): void {
    const currentTime = Date.now();
    this.metrics.timeElapsed = currentTime - this.startTime;

    // Cálculo de progreso total basado en fases completadas
    this.metrics.totalProgress = this.calculateTotalProgress();

    // Estimación heurística de tiempo restante
    this.metrics.timeEstimated = this.heuristicEstimator.estimateRemainingTime(
      this.metrics.totalProgress,
      this.metrics.timeElapsed,
      this.phases
    );

    // Cálculo de velocidad basado en buffer de canales
    this.metrics.velocity = this.calculateChannelVelocity();

    // Porcentaje procesado con granularidad fina
    this.metrics.processedPercentage = this.calculateProcessedPercentage();

    // Fase actual
    this.metrics.currentPhase = this.getCurrentPhaseDescription();

    // Throughput de procesamiento
    this.metrics.throughput = this.calculateThroughput();

    this.emitProgressEvent('metrics_update', undefined, undefined);
  }

  /**
   * Cálculo holístico del progreso total
   */
  private calculateTotalProgress(): number {
    let totalProgress = 0;

    for (const phase of this.phases.values()) {
      const phaseProgress = (phase.currentStep / phase.totalSteps) * 100;
      const weightedProgress = (phaseProgress * phase.weight) / 100;
      totalProgress += weightedProgress;
    }

    return Math.min(Math.round(totalProgress * 100) / 100, 100);
  }

  /**
   * Cálculo de velocidad de canales encontrados
   */
  private calculateChannelVelocity(): number {
    if (this.channelBuffer.length === 0 || this.metrics.timeElapsed === 0) {
      return 0;
    }

    const totalChannelsInBuffer = this.channelBuffer.reduce((sum, count) => sum + count, 0);
    const timeInMinutes = this.metrics.timeElapsed / 60000;
    if (timeInMinutes === 0) return 0;
    
    return Math.round((this.metrics.channelsFound / timeInMinutes) * 100) / 100;
  }

  /**
   * Cálculo granular del porcentaje procesado
   */
  private calculateProcessedPercentage(): number {
    const activePhases = Array.from(this.phases.values())
      .filter(phase => phase.status === 'active' || phase.status === 'completed');

    if (activePhases.length === 0) return 0;

    const totalWeight = activePhases.reduce((sum, phase) => sum + phase.weight, 0);
    if (totalWeight === 0) return 0;

    const processedWeight = activePhases
      .filter(phase => phase.status === 'completed')
      .reduce((sum, phase) => sum + phase.weight, 0);

    const activePhaseContribution = activePhases
      .filter(phase => phase.status === 'active')
      .reduce((sum, phase) => {
        const phaseProgress = phase.currentStep / phase.totalSteps;
        return sum + (phase.weight * phaseProgress);
      }, 0);

    return Math.round(((processedWeight + activePhaseContribution) / totalWeight) * 10000) / 100;
  }

  /**
   * Descripción de la fase actual
   */
  private getCurrentPhaseDescription(): string {
    const activePhase = Array.from(this.phases.values())
      .find(phase => phase.status === 'active');

    if (activePhase) {
      const progress = Math.round((activePhase.currentStep / activePhase.totalSteps) * 100);
      return `${activePhase.name} (${progress}%)`;
    }

    const completedPhases = Array.from(this.phases.values())
      .filter(phase => phase.status === 'completed').length;

    if (completedPhases === this.phases.size) {
      return 'Escaneo Completado';
    }

    return 'Preparando siguiente fase...';
  }

  /**
   * Cálculo de throughput de procesamiento
   */
  private calculateThroughput(): number {
    if (this.metrics.timeElapsed === 0) return 0;
    
    const operationsCompleted = Array.from(this.phases.values())
      .reduce((sum, phase) => sum + phase.currentStep, 0);
    
    const timeInSeconds = this.metrics.timeElapsed / 1000;
    return Math.round((operationsCompleted / timeInSeconds) * 100) / 100;
  }

  /**
   * Emisión de eventos de progreso
   */
  private emitProgressEvent(
    type: ProgressEvent['type'], 
    phase?: ProgressPhase, 
    message?: string
  ): void {
    const event: ProgressEvent = {
      type,
      phase,
      metrics: { ...this.metrics },
      message,
      timestamp: Date.now()
    };

    this.progressCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error en callback de progreso:', error);
      }
    });
  }

  /**
   * Manejo de errores con actualización de progreso
   */
  public reportError(phaseId: string, error: string): void {
    const phase = this.phases.get(phaseId);
    if (phase) {
      phase.status = 'error';
    }

    this.emitProgressEvent('error', phase, `Error en ${phase?.name || phaseId}: ${error}`);
  }

  /**
   * Actualización incremental específica para conexión a gensparkspace
   */
  public updateGensparkConnection(step: 'resolving_dns' | 'establishing_tcp' | 'ssl_handshake' | 'authentication' | 'ready'): void {
    const stepMessages = {
      resolving_dns: 'Resolviendo DNS de ixdjkahn.gensparkspace.com...',
      establishing_tcp: 'Estableciendo conexión TCP...',
      ssl_handshake: 'Negociando SSL/TLS...',
      authentication: 'Autenticando credenciales...',
      ready: 'Conexión establecida exitosamente'
    };

    this.advancePhase('connection_setup', 1, { message: stepMessages[step] });
  }

  /**
   * Actualización específica para descubrimiento de canales
   */
  public updateChannelDiscovery(
    endpoint: string, 
    channelsFound: number, 
    totalEndpoints: number, 
    currentEndpoint: number
  ): void {
    const message = `Probando ${endpoint} - ${channelsFound} canales encontrados (${currentEndpoint}/${totalEndpoints})`;
    
    this.advancePhase('channel_discovery', 1, { 
      channelsFound, 
      message 
    });
  }

  /**
   * Registro de callback para actualizaciones
   */
  public onProgressUpdate(callback: (event: ProgressEvent) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Retornar función de limpieza
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Detener tracking
   */
  public stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Reiniciar tracking
   */
  public resetTracking(): void {
    this.stopTracking();
    this.initializeProgressPhases();
    this.initializeMetrics();
    this.channelBuffer = [];
    this.heuristicEstimator.reset();
  }

  // Getters públicos
  public getCurrentMetrics(): ProgressMetrics {
    return { ...this.metrics };
  }

  public getAllPhases(): ProgressPhase[] {
    return Array.from(this.phases.values());
  }

  public getPhaseProgress(phaseId: string): number {
    const phase = this.phases.get(phaseId);
    return phase ? (phase.currentStep / phase.totalSteps) * 100 : 0;
  }
}

/**
 * Estimador Heurístico de Tiempo Restante
 */
class HeuristicEstimator {
  private historicalData: { progress: number; time: number }[];
  private progressVelocity: number[];

  constructor() {
    this.historicalData = [];
    this.progressVelocity = [];
  }

  public estimateRemainingTime(
    currentProgress: number, 
    elapsedTime: number, 
    phases: Map<string, ProgressPhase>
  ): number {
    // Agregar punto de datos actual
    this.historicalData.push({ progress: currentProgress, time: elapsedTime });
    
    // Mantener solo los últimos 20 puntos de datos
    if (this.historicalData.length > 20) {
      this.historicalData.shift();
    }

    if (this.historicalData.length < 2) {
      // Estimación inicial basada en duración estimada de fases
      const totalEstimatedDuration = Array.from(phases.values())
        .reduce((sum, phase) => sum + phase.estimatedDuration, 0);
      
      const remainingWeight = Array.from(phases.values())
        .filter(phase => phase.status !== 'completed')
        .reduce((sum, phase) => sum + phase.weight, 0);

      return (totalEstimatedDuration * remainingWeight) / 100;
    }

    // Cálculo de velocidad de progreso
    const recent = this.historicalData.slice(-5); // Últimos 5 puntos
    let avgVelocity = 0;

    if (recent.length > 1) {
        for (let i = 1; i < recent.length; i++) {
            const progressDiff = recent[i].progress - recent[i-1].progress;
            const timeDiff = recent[i].time - recent[i-1].time;
            
            if (timeDiff > 0) {
                avgVelocity += progressDiff / timeDiff;
            }
        }

        avgVelocity /= (recent.length - 1);
    }


    if (avgVelocity <= 0) {
      return 0;
    }

    // Estimación lineal con factor de corrección heurístico
    const remainingProgress = 100 - currentProgress;
    const estimatedTime = remainingProgress / avgVelocity;
    
    // Factor de corrección basado en fases restantes
    const remainingPhases = Array.from(phases.values())
      .filter(phase => phase.status === 'pending' || phase.status === 'active');
    
    const correctionFactor = Math.max(0.8, Math.min(1.5, remainingPhases.length / 3));
    
    return estimatedTime * correctionFactor;
  }

  public reset(): void {
    this.historicalData = [];
    this.progressVelocity = [];
  }
}

// Instancia singleton global
let globalProgressTracker: IPTVProgressTracker;

export function getProgressTracker(): IPTVProgressTracker {
  if (!globalProgressTracker) {
    globalProgressTracker = new IPTVProgressTracker();
  }
  return globalProgressTracker;
}

export function resetProgressTracker(): void {
  if (globalProgressTracker) {
    globalProgressTracker.resetTracking();
  }
  globalProgressTracker = new IPTVProgressTracker();
}
