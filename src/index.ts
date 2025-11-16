import * as dotenv from 'dotenv';
import { Logger, LogLevel } from './utils/Logger';
import { MCPServer } from './core/MCPServer';
import { HTTPTransport } from './core/HTTPTransport';
import { WeatherAPITool } from './tools/WeatherAPITool';

// Load environment variables from .env file
dotenv.config();

/**
 * Validate required environment variables
 * @throws Error if required configuration is missing or invalid
 */
function validateConfiguration(): void {
  const errors: string[] = [];

  // Validate LOG_LEVEL if provided
  if (process.env.LOG_LEVEL) {
    const validLevels = ['debug', 'info', 'warning', 'error'];
    const level = process.env.LOG_LEVEL.toLowerCase();
    if (!validLevels.includes(level)) {
      errors.push(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Must be one of: ${validLevels.join(', ')}`);
    }
  }

  // Validate PORT if provided
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535`);
    }
  }

  // Warn if WEATHER_API_KEY is not set (not a hard error, but important)
  if (!process.env.WEATHER_API_KEY) {
    console.warn('WARNING: WEATHER_API_KEY is not set. Weather API functionality will not work.');
    console.warn('Get your free API key from: https://openweathermap.org/api');
  }

  // Throw error if any validation errors occurred
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Main application entry point
 * Initializes and starts the MCP API Converter server
 */
async function main() {
  try {
    // Validate configuration on startup
    validateConfiguration();

    // Initialize Logger with appropriate log level from environment
    const logLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || LogLevel.INFO;
    Logger.setLevel(logLevel);
    
    Logger.info('Starting MCP API Converter', { 
      logLevel,
      nodeVersion: process.version 
    });

    // Instantiate MCPServer
    const mcpServer = new MCPServer();

    // Create and register WeatherAPITool instance
    const weatherTool = new WeatherAPITool();
    mcpServer.registerTool(weatherTool);

    // Get configured port from environment or use default
    const port = parseInt(process.env.PORT || '3000', 10);

    // Initialize HTTPTransport with MCPServer
    const httpTransport = new HTTPTransport(mcpServer);

    // Start HTTP server on configured port
    await httpTransport.start(port);

    // Add startup logging with server URL and registered tools
    const registeredTools = mcpServer.listTools();
    Logger.info('MCP API Converter started successfully', {
      serverUrl: `http://localhost:${port}`,
      port,
      registeredTools: registeredTools.map(t => t.name),
      toolCount: registeredTools.length
    });

    // Implement graceful shutdown handling
    const shutdown = async (signal: string) => {
      Logger.info('Shutdown signal received', { signal });
      
      try {
        Logger.info('Stopping HTTP server...');
        await httpTransport.stop();
        
        Logger.info('MCP API Converter shut down successfully');
        process.exit(0);
      } catch (error) {
        Logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };

    // Register shutdown handlers for various signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      Logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      Logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
      shutdown('unhandledRejection');
    });

  } catch (error) {
    Logger.error('Failed to start MCP API Converter', error as Error);
    process.exit(1);
  }
}

// Start the application
main();
