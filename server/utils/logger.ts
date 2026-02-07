/**
 * Logger Utility
 * Winston-based logger with file and console transports
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'opportunity-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
    }),
  ],
});

// Create a child logger for specific modules
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
