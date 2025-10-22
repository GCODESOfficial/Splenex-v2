/**
 * Secure Logger - Production-Safe Logging Utility
 * 
 * Automatically disables sensitive logs in production
 * Only shows critical errors to users
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Sanitize sensitive data before logging
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitize(data: any): any {
  if (typeof data === 'string') {
    // Mask wallet addresses (0x...)
    data = data.replace(/(0x[a-fA-F0-9]{40})/g, '0x****');
    // Mask transaction hashes
    data = data.replace(/(0x[a-fA-F0-9]{64})/g, '0x****');
    // Mask API keys
    data = data.replace(/([a-zA-Z0-9_-]{32,})/g, '****');
  }
  
  if (typeof data === 'object' && data !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      // Remove sensitive keys
      if (['privateKey', 'apiKey', 'secret', 'password', 'token', 'signature'].some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '****';
      } else if (key === 'address' && typeof data[key] === 'string' && data[key].startsWith('0x')) {
        sanitized[key] = data[key].slice(0, 6) + '****';
      } else {
        sanitized[key] = sanitize(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Secure Logger Class
 */
class SecureLogger {
  /**
   * Development-only logs (completely disabled in production)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dev(...args: any[]) {
    if (IS_DEV) {
      console.log('[DEV]', ...args);
    }
  }

  /**
   * Info logs (disabled in production)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(...args: any[]) {
    if (IS_DEV) {
      console.log('[INFO]', ...args);
    }
  }

  /**
   * Warning logs (sanitized in production)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(...args: any[]) {
    if (IS_PRODUCTION) {
      console.warn('[WARN]', ...args.map(sanitize));
    } else {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error logs (always shown, but sanitized in production)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(...args: any[]) {
    if (IS_PRODUCTION) {
      console.error('[ERROR]', ...args.map(sanitize));
    } else {
      console.error('[ERROR]', ...args);
    }
  }

  /**
   * Success logs (disabled in production)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  success(...args: any[]) {
    if (IS_DEV) {
      console.log('[SUCCESS]', ...args);
    }
  }

  /**
   * Security logs (always enabled, highly sanitized)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  security(message: string, details?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[SECURITY ${timestamp}]`, message, IS_PRODUCTION && details ? sanitize(details) : details);
  }
}

export const logger = new SecureLogger();

/**
 * Helper to disable all console logs in production
 */
export function disableConsoleInProduction() {
  if (IS_PRODUCTION) {
    // Disable console.log completely
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    
    // Keep error and warn but sanitize
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error = (...args: any[]) => {
      originalError(...args.map(sanitize));
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.warn = (...args: any[]) => {
      originalWarn(...args.map(sanitize));
    };
  }
}

