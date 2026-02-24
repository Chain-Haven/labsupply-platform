/**
 * Structured logging utility.
 * Provides JSON-formatted log output and a helper for non-critical async operations.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
        level,
        msg: message,
        ts: new Date().toISOString(),
        ...context,
    };
    return JSON.stringify(entry);
}

export const logger = {
    debug(message: string, context?: LogContext) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(formatLog('debug', message, context));
        }
    },
    info(message: string, context?: LogContext) {
        console.log(formatLog('info', message, context));
    },
    warn(message: string, context?: LogContext) {
        console.warn(formatLog('warn', message, context));
    },
    error(message: string, context?: LogContext) {
        console.error(formatLog('error', message, context));
    },
};

/**
 * Fire-and-forget wrapper for non-critical async operations.
 * Logs failures as warnings instead of silently swallowing them.
 *
 * Replaces the `.then(() => {}, () => {})` antipattern.
 */
export function logNonCritical(promise: PromiseLike<unknown>, context: string): void {
    Promise.resolve(promise).catch(err => {
        logger.warn('Non-critical operation failed', {
            context,
            error: err instanceof Error ? err.message : String(err),
        });
    });
}
