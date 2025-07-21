/**
 * Logger utility for StratisQL
 * Supports info, warn, error, and query profiling (timing, slow query log)
 * Logging can be enabled/disabled at runtime.
 */
export class Logger {
  private _enabled = true;
  private _slowQueryLogging = true;
  slowQueryThresholdMs = 500; // Log queries slower than this (ms)

  /** Enable or disable all logging */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /** Enable or disable slow query logging */
  setSlowQueryLogging(enabled: boolean): void {
    this._slowQueryLogging = enabled;
  }

  /** Log an info message */
  info(message: string, ...args: any[]): void {
    if (!this._enabled) return;
    console.log(`[INFO]`, message, ...args);
  }

  /** Log a warning message */
  warn(message: string, ...args: any[]): void {
    if (!this._enabled) return;
    console.warn(`[WARN]`, message, ...args);
  }

  /** Log an error message */
  error(message: string, ...args: any[]): void {
    if (!this._enabled) return;
    console.error(`[ERROR]`, message, ...args);
  }

  /** Profile a query and log if slow */
  async profileQuery<T>(sql: string, params: any[], fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      if (this._enabled && this._slowQueryLogging && duration > this.slowQueryThresholdMs) {
        this.warn(`Slow query (${duration}ms):`, sql, params);
      }
      return result;
    } catch (err) {
      if (this._enabled) this.error(`Query failed:`, sql, params, err);
      throw err;
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger(); 