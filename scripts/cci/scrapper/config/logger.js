// logger.js
import { createLogger, format, transports } from 'winston';

// Define the log format
const logFormat = format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create the logger
const logger = createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
      },
  level: 'info', // Set the default log level
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add a timestamp
    format.errors({ stack: true }), // Include stack trace on error
    logFormat
  ),
  transports: [
    // new transports.Console(), // Log to the console
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Log errors to a file
    new transports.File({ filename: 'logs/combined.log' }) // Log everything to a combined file
  ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console());
  }

  export default logger;
