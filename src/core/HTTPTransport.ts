import * as http from 'http';
import { MCPServer } from './MCPServer';
import { MCPRequest, MCPResponse } from '../types';
import { Logger } from '../utils/Logger';

/**
 * HTTP Transport layer for MCP server
 * Exposes MCP server functionality via HTTP protocol
 */
export class HTTPTransport {
  private server: http.Server | null = null;
  private mcpServer: MCPServer;

  constructor(mcpServer: MCPServer) {
    this.mcpServer = mcpServer;
    Logger.debug('HTTPTransport initialized');
  }

  /**
   * Start the HTTP server on the specified port
   * @param port - Port number to listen on
   * @returns Promise that resolves when server is listening
   */
  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res).catch(error => {
            Logger.error('Unhandled error in request handler', error as Error);
          });
        });

        this.server.listen(port, () => {
          Logger.info('HTTP server started', { port, url: `http://localhost:${port}` });
          resolve();
        });

        this.server.on('error', (error) => {
          Logger.error('HTTP server error', error as Error);
          reject(error);
        });
      } catch (error) {
        Logger.error('Failed to start HTTP server', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   * Parses MCP protocol messages and routes to appropriate handlers
   * @param req - HTTP request object
   * @param res - HTTP response object
   */
  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    Logger.debug('HTTP request received', { 
      method: req.method, 
      url: req.url,
      headers: req.headers 
    });

    // Set CORS headers for cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle GET requests as health checks
    if (req.method === 'GET') {
      this.handleHealthCheck(res);
      return;
    }

    // Only accept POST requests for MCP protocol
    if (req.method !== 'POST') {
      this.sendErrorResponse(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and POST requests are supported');
      return;
    }

    try {
      // Parse request body
      const body = await this.parseRequestBody(req);
      
      Logger.debug('Request body parsed', { body });

      // Parse MCP request
      const mcpRequest = this.parseMCPRequest(body);

      // Route to appropriate handler
      const mcpResponse = await this.routeRequest(mcpRequest);

      // Send response
      this.sendSuccessResponse(res, mcpResponse);

    } catch (error) {
      Logger.error('Request handling failed', error as Error);
      
      if (error instanceof SyntaxError) {
        this.sendErrorResponse(res, 400, 'INVALID_JSON', 'Request body must be valid JSON');
      } else if (error instanceof Error) {
        this.sendErrorResponse(res, 400, 'BAD_REQUEST', error.message);
      } else {
        this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
      }
    }
  }

  /**
   * Parse the request body from the incoming HTTP request
   * @param req - HTTP request object
   * @returns Promise resolving to the parsed body string
   */
  private parseRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        resolve(body);
      });

      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse and validate MCP request from JSON string
   * @param body - JSON string containing MCP request
   * @returns Parsed MCPRequest object
   * @throws Error if request is malformed
   */
  private parseMCPRequest(body: string): MCPRequest {
    const parsed = JSON.parse(body);

    if (!parsed.method) {
      throw new Error('Missing required field: method');
    }

    if (parsed.method !== 'tools/list' && parsed.method !== 'tools/call') {
      throw new Error(`Unsupported method: ${parsed.method}`);
    }

    if (parsed.method === 'tools/call') {
      if (!parsed.params?.name) {
        throw new Error('Missing required field: params.name for tools/call');
      }
    }

    return parsed as MCPRequest;
  }

  /**
   * Route MCP request to appropriate handler
   * @param request - Parsed MCP request
   * @returns Promise resolving to MCP response
   */
  private async routeRequest(request: MCPRequest): Promise<MCPResponse> {
    Logger.info('Routing MCP request', { method: request.method });

    try {
      if (request.method === 'tools/list') {
        return await this.handleToolsList();
      } else if (request.method === 'tools/call') {
        return await this.handleToolsCall(request.params!);
      }

      throw new Error(`Unsupported method: ${request.method}`);
    } catch (error) {
      Logger.error('Request routing failed', error as Error);
      throw error;
    }
  }

  /**
   * Handle GET requests as health checks
   * @param res - HTTP response object
   */
  private handleHealthCheck(res: http.ServerResponse): void {
    const healthStatus = {
      status: 'ok',
      service: 'MCP API Converter',
      timestamp: new Date().toISOString(),
      toolCount: this.mcpServer.getToolCount()
    };

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(healthStatus));

    Logger.debug('Health check request handled');
  }

  /**
   * Handle tools/list MCP method
   * @returns MCP response with list of available tools
   */
  private async handleToolsList(): Promise<MCPResponse> {
    const tools = this.mcpServer.listTools();
    
    Logger.info('Tools list requested', { count: tools.length });

    return {
      result: {
        tools
      }
    };
  }

  /**
   * Handle tools/call MCP method
   * @param params - Request parameters containing tool name and arguments
   * @returns MCP response with tool execution result
   */
  private async handleToolsCall(params: { name?: string; arguments?: any }): Promise<MCPResponse> {
    const { name, arguments: args } = params;

    if (!name) {
      throw new Error('Tool name is required');
    }

    Logger.info('Tool call requested', { toolName: name, arguments: args });

    try {
      const result = await this.mcpServer.executeTool(name, args || {});
      
      return {
        result
      };
    } catch (error) {
      Logger.error('Tool execution failed', error as Error, { toolName: name });
      
      return {
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Tool execution failed'
        }
      };
    }
  }

  /**
   * Send successful MCP response
   * @param res - HTTP response object
   * @param mcpResponse - MCP response to send
   */
  private sendSuccessResponse(res: http.ServerResponse, mcpResponse: MCPResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(mcpResponse));

    Logger.debug('Response sent', { response: mcpResponse });
  }

  /**
   * Send error response
   * @param res - HTTP response object
   * @param statusCode - HTTP status code
   * @param errorCode - Application error code
   * @param message - Error message
   */
  private sendErrorResponse(
    res: http.ServerResponse, 
    statusCode: number, 
    errorCode: string, 
    message: string
  ): void {
    const errorResponse: MCPResponse = {
      error: {
        code: statusCode,
        message: `${errorCode}: ${message}`
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(JSON.stringify(errorResponse));

    Logger.warning('Error response sent', { statusCode, errorCode, message });
  }

  /**
   * Stop the HTTP server
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (!this.server) {
      Logger.warning('Attempted to stop server that is not running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          Logger.error('Error stopping HTTP server', error as Error);
          reject(error);
        } else {
          Logger.info('HTTP server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }
}
