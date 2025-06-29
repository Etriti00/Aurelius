/**
 * Animation performance management utilities
 * Implements FPS limiting and visibility-based optimization
 */

interface AnimationConfig {
  targetFPS: number;
  enablePerformanceMode: boolean;
  pauseWhenNotVisible: boolean;
  reducedMotionRespect: boolean;
}

interface PerformanceMetrics {
  averageFPS: number;
  frameDrops: number;
  isPerformanceModeActive: boolean;
}

class AnimationPerformanceManager {
  private config: AnimationConfig;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameInterval: number;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private readonly MAX_FPS_SAMPLES = 60;
  private performanceMode: boolean = false;
  private visibilityObserver: IntersectionObserver | null = null;
  private isVisible: boolean = true;
  private animationCallbacks: Set<(deltaTime: number) => void> = new Set();

  constructor(config: Partial<AnimationConfig> = {}) {
    this.config = {
      targetFPS: 30, // Conservative 30fps for performance
      enablePerformanceMode: true,
      pauseWhenNotVisible: true,
      reducedMotionRespect: true,
      ...config
    };
    
    this.frameInterval = 1000 / this.config.targetFPS;
    this.setupPerformanceMonitoring();
  }

  private setupPerformanceMonitoring(): void {
    // Check for reduced motion preference
    if (this.config.reducedMotionRespect && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.performanceMode = mediaQuery.matches;
      
      mediaQuery.addEventListener('change', (e) => {
        this.performanceMode = e.matches;
      });
    }
  }

  private calculateFPS(currentTime: number): number {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      return 0;
    }

    const deltaTime = currentTime - this.lastFrameTime;
    const fps = 1000 / deltaTime;
    
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.MAX_FPS_SAMPLES) {
      this.fpsHistory.shift();
    }

    this.lastFrameTime = currentTime;
    return fps;
  }

  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  private shouldSkipFrame(currentTime: number): boolean {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      return false;
    }

    const deltaTime = currentTime - this.lastFrameTime;
    
    // Skip frame if we haven't reached the target frame interval
    if (deltaTime < this.frameInterval) {
      return true;
    }

    // Enable performance mode if FPS drops below threshold
    if (this.config.enablePerformanceMode) {
      const avgFPS = this.getAverageFPS();
      if (avgFPS > 0 && avgFPS < this.config.targetFPS * 0.8) {
        this.performanceMode = true;
      }
    }

    return false;
  }

  private animate = (currentTime: number): void => {
    if (!this.shouldContinueAnimation()) {
      return;
    }

    if (this.shouldSkipFrame(currentTime)) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }

    // Calculate delta time for smooth animations
    const deltaTime = this.lastFrameTime > 0 ? currentTime - this.lastFrameTime : 0;
    
    // Calculate current FPS (for monitoring)
    this.calculateFPS(currentTime);
    
    // Execute animation callbacks
    this.animationCallbacks.forEach(callback => {
      try {
        callback(deltaTime);
      } catch (error) {
        console.error('Animation callback error:', error);
      }
    });

    this.frameCount++;
    this.lastFrameTime = currentTime;
    
    // Continue animation loop
    this.animationId = requestAnimationFrame(this.animate);
  };

  private shouldContinueAnimation(): boolean {
    // Pause if not visible and visibility pausing is enabled
    if (this.config.pauseWhenNotVisible && !this.isVisible) {
      return false;
    }

    // Pause if user prefers reduced motion and performance mode is active
    if (this.config.reducedMotionRespect && this.performanceMode) {
      return false;
    }

    return true;
  }

  start(): void {
    if (this.animationId === null) {
      this.frameCount = 0;
      this.lastFrameTime = 0;
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  addCallback(callback: (deltaTime: number) => void): () => void {
    this.animationCallbacks.add(callback);
    
    // Return cleanup function
    return () => {
      this.animationCallbacks.delete(callback);
    };
  }

  setupVisibilityObserver(element: HTMLElement): () => void {
    if (!this.config.pauseWhenNotVisible || typeof window === 'undefined') {
      return () => {};
    }

    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isVisible = entry.isIntersecting;
        
        if (this.isVisible && this.animationId === null) {
          this.start();
        } else if (!this.isVisible && this.animationId !== null) {
          this.stop();
        }
      },
      {
        threshold: 0.1, // Consider visible if 10% is showing
      }
    );

    this.visibilityObserver.observe(element);

    // Return cleanup function
    return () => {
      if (this.visibilityObserver) {
        this.visibilityObserver.disconnect();
        this.visibilityObserver = null;
      }
    };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return {
      averageFPS: this.getAverageFPS(),
      frameDrops: this.fpsHistory.filter(fps => fps < this.config.targetFPS * 0.9).length,
      isPerformanceModeActive: this.performanceMode,
    };
  }

  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
  }

  updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.frameInterval = 1000 / this.config.targetFPS;
  }

  cleanup(): void {
    this.stop();
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    this.animationCallbacks.clear();
  }
}

// Export utilities
export { AnimationPerformanceManager, type AnimationConfig, type PerformanceMetrics };

/**
 * Hook for using animation performance manager in React components
 */
export function createAnimationManager(config?: Partial<AnimationConfig>): AnimationPerformanceManager {
  return new AnimationPerformanceManager(config);
}