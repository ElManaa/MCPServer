export enum LogLevel {
  INFO = 'info',
  DEBUG = 'debug',
  WARNING = 'warning',
  ERROR = 'error'
}

interface LogContext {
  [key: string]: any;
}

export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;
  private static readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARNING]: 2,
    [LogLevel.ERROR]: 3
  };

  /**
   * Set the minimum log level to display
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Log an informational message
   */
  static info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message
   */
  static debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a warning message
   */
  static warning(message: string, context?: LogContext): void {
    this.log(LogLevel.WARNING, message, context);
  }

  /**
   * Log an error message with optional error object
   */
  static error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context
    };

    if (error) {
      errorContext.errorMessage = error.message;
      errorContext.errorName = error.name;
      
      // Capture stack trace for error level logs
      if (error.stack) {
        errorContext.stackTrace = error.stack;
      }
    }

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Internal log method that handles filtering and formatting
   */
  private static log(level: LogLevel, message: string, context?: LogContext): void {
    // Implement log level filtering mechanism
    if (this.levelPriority[level] < this.levelPriority[this.currentLevel]) {
      return;
    }

    // Add timestamp formatting
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(7);
    
    let logMessage = `[${timestamp}] [${levelStr}] ${message}`;

    // Add context object support
    if (context && Object.keys(context).length > 0) {
      logMessage += ` ${JSON.stringify(context)}`;
    }

    // Output to console based on level
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.WARNING:
        console.warn(logMessage);
        break;
      case LogLevel.DEBUG:
      case LogLevel.INFO:
      default:
        console.log(logMessage);
        break;
    }
  }
}
