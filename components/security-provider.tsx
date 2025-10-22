"use client";

import { useEffect } from "react";

/**
 * Security Provider Component
 * 
 * Automatically initializes security features when the app loads
 * - Disables console logs in production
 * - Sanitizes any remaining logs
 * - Blocks common hacking attempts
 */
export function SecurityProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const IS_PRODUCTION = process.env.NODE_ENV === 'production';

    if (IS_PRODUCTION) {
      // Disable all console methods in production
      const noop = () => {};
      
      // Save originals for internal use
      const originalError = console.error;
      const originalWarn = console.warn;

      // Disable debug logs completely
      console.log = noop;
      console.info = noop;
      console.debug = noop;
      console.trace = noop;
      console.table = noop;
      console.dir = noop;
      console.dirxml = noop;
      console.group = noop;
      console.groupCollapsed = noop;
      console.groupEnd = noop;
      console.time = noop;
      console.timeEnd = noop;
      console.count = noop;
      console.profile = noop;
      console.profileEnd = noop;

      // Sanitize errors and warnings
      console.error = (...args: unknown[]) => {
        const sanitized = args.map(arg => {
          if (typeof arg === 'string') {
            return arg
              .replace(/(0x[a-fA-F0-9]{40})/g, '0x****')
              .replace(/(0x[a-fA-F0-9]{64})/g, '0x****')
              .replace(/([a-zA-Z0-9_-]{32,})/g, '****');
          }
          return arg;
        });
        originalError('[ERROR]', ...sanitized);
      };

      console.warn = (...args: unknown[]) => {
        const sanitized = args.map(arg => {
          if (typeof arg === 'string') {
            return arg
              .replace(/(0x[a-fA-F0-9]{40})/g, '0x****')
              .replace(/(0x[a-fA-F0-9]{64})/g, '0x****');
          }
          return arg;
        });
        originalWarn('[WARN]', ...sanitized);
      };

      // Disable right-click (optional - uncomment if needed)
      // document.addEventListener('contextmenu', (e) => e.preventDefault());

      // Disable F12 and Ctrl+Shift+I (optional - uncomment if needed)
      // document.addEventListener('keydown', (e) => {
      //   if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
      //     e.preventDefault();
      //   }
      // });

      // Block common XSS attempts
      const blockXSS = () => {
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /onerror=/i,
          /onclick=/i,
        ];

        document.querySelectorAll('input, textarea').forEach((element) => {
          element.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const value = target.value;
            
            if (suspiciousPatterns.some(pattern => pattern.test(value))) {
              target.value = '';
              originalWarn('[SECURITY] Suspicious input blocked');
            }
          });
        });
      };

      blockXSS();
    }

    // Development mode indicators
    if (!IS_PRODUCTION) {
      console.log(
        '%c🔓 Development Mode',
        'color: #FCD404; font-size: 16px; font-weight: bold;'
      );
      console.log('%cConsole logging enabled', 'color: #888');
    } else {
      // Production mode - show minimal branding
      console.log(
        '%c🔒 Splenex',
        'color: #FCD404; font-size: 20px; font-weight: bold;'
      );
    }
  }, []);

  return <>{children}</>;
}

