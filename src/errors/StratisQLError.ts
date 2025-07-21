/**
 * Custom error class for StratisQL
 * Includes error code, type, and user-friendly message
 */
export class StratisQLError extends Error {
  code: string;
  type: string;
  userMessage: string;
  originalError?: any;

  /**
   * Create a new StratisQLError
   * @param message Developer message
   * @param code Error code
   * @param originalError Optional original error
   * @param type Error type (default: 'General')
   * @param userMessage User-friendly message
   */
  constructor(message: string, code: string, originalError?: any, type: string = 'General', userMessage?: string) {
    super(message);
    this.code = code;
    this.type = type;
    this.userMessage = userMessage || 'An unexpected error occurred.';
    this.originalError = originalError;
  }
} 