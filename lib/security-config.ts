/**
 * Security Configuration
 * 
 * Centralized security settings for the platform
 */

export const SECURITY_CONFIG = {
  // Production mode detection
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // API Security
  API: {
    RATE_LIMIT_PER_MINUTE: 60,
    MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
    TIMEOUT_MS: 30000, // 30 seconds
  },
  
  // Wallet Security
  WALLET: {
    // Use calculated approvals instead of max to avoid MetaMask security warnings
    // Max approval pattern is commonly used by scams
    APPROVAL_MULTIPLIER: 1.5, // Approve 1.5x the required amount as buffer
    MIN_TRANSACTION_DELAY_MS: 1000, // Prevent rapid-fire txs
    // DEPRECATED: Do not use MAX_APPROVAL_AMOUNT - triggers MetaMask security warnings
    // MAX_APPROVAL_AMOUNT: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  },
  
  // Swap Security
  SWAP: {
    MIN_AMOUNT: 0.000001,
    MAX_SLIPPAGE: 50, // 50%
    DEFAULT_SLIPPAGE: 1, // 1%
  },
  
  // Logging
  LOGGING: {
    ENABLE_CONSOLE: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    SANITIZE_ADDRESSES: true,
    SANITIZE_TX_HASHES: true,
    LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'),
  },
  
  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", 'data:', 'https:'],
    CONNECT_SRC: ["'self'", 'https:', 'wss:'],
    FRAME_SRC: ["'none'"],
  },
  
  // Sensitive data patterns (never log these)
  SENSITIVE_PATTERNS: [
    /0x[a-fA-F0-9]{64}/, // Transaction hashes
    /0x[a-fA-F0-9]{40}/, // Wallet addresses  
    /[a-zA-Z0-9_-]{32,}/, // API keys
    /sk_[a-zA-Z0-9]{32,}/, // Secret keys
    /pk_[a-zA-Z0-9]{32,}/, // Private keys
  ],
};

/**
 * Sanitize data for logging
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeForLogging(data: any): any {
  if (!SECURITY_CONFIG.LOGGING.SANITIZE_ADDRESSES && !SECURITY_CONFIG.LOGGING.SANITIZE_TX_HASHES) {
    return data;
  }
  
  if (typeof data === 'string') {
    let sanitized = data;
    
    if (SECURITY_CONFIG.LOGGING.SANITIZE_ADDRESSES) {
      // Mask wallet addresses: 0x1234...5678
      sanitized = sanitized.replace(/(0x[a-fA-F0-9]{40})/g, (match) => {
        return match.slice(0, 6) + '...' + match.slice(-4);
      });
    }
    
    if (SECURITY_CONFIG.LOGGING.SANITIZE_TX_HASHES) {
      // Mask transaction hashes
      sanitized = sanitized.replace(/(0x[a-fA-F0-9]{64})/g, (match) => {
        return match.slice(0, 10) + '...';
      });
    }
    
    // Mask API keys
    sanitized = sanitized.replace(/([a-zA-Z0-9_-]{32,})/g, '****');
    
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const key in data) {
      if (['privateKey', 'apiKey', 'secret', 'password', 'mnemonic', 'seed'].includes(key.toLowerCase())) {
        sanitized[key] = '****REDACTED****';
      } else {
        sanitized[key] = sanitizeForLogging(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Check if string contains sensitive data
 */
export function containsSensitiveData(str: string): boolean {
  return SECURITY_CONFIG.SENSITIVE_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Validate input data for security
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateInput(input: any, type: 'address' | 'amount' | 'chainId'): boolean {
  switch (type) {
    case 'address':
      return /^0x[a-fA-F0-9]{40}$/.test(input);
    case 'amount':
      return !isNaN(parseFloat(input)) && parseFloat(input) >= SECURITY_CONFIG.SWAP.MIN_AMOUNT;
    case 'chainId':
      return /^(0x)?[0-9a-fA-F]+$/.test(input);
    default:
      return false;
  }
}

