/**
 * Type definitions for MCP API Converter
 */

/**
 * JSON Schema property definition
 */
export interface SchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

/**
 * Tool definition for MCP protocol
 * Represents the metadata and schema for an MCP tool
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required?: string[];
  };
}

/**
 * MCP protocol request message
 */
export interface MCPRequest {
  method: 'tools/list' | 'tools/call';
  params?: {
    name?: string;
    arguments?: any;
  };
}

/**
 * MCP protocol response message
 */
export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Weather response format
 */
export interface WeatherResponse {
  location: string;
  temperature: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  conditions: string;
  humidity?: number;
  windSpeed?: number;
  timestamp: string;
}

/**
 * Task documentation content structure
 */
export interface TaskDocContent {
  objective: string;
  implementation: string;
  files: string[];
  notes?: string;
}
