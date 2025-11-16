import { ToolDefinition } from '../types';
import { z } from 'zod';

/**
 * Abstract base class for all API tools
 * Provides common functionality for MCP tool integration
 */
export abstract class BaseTool {
  /**
   * Unique name identifier for the tool
   */
  abstract readonly name: string;

  /**
   * Human-readable description of what the tool does
   */
  abstract readonly description: string;

  /**
   * JSON Schema defining the tool's input parameters
   */
  abstract readonly inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  /**
   * Execute the tool with the provided parameters
   * @param params - Input parameters matching the inputSchema
   * @returns Promise resolving to the tool's result
   */
  abstract execute(params: any): Promise<any>;

  /**
   * Get the tool definition formatted for MCP protocol
   * @returns ToolDefinition object for MCP registration
   */
  getToolDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema,
    };
  }

  /**
   * Validate parameters against the tool's input schema
   * @param params - Parameters to validate
   * @returns true if valid, false otherwise
   */
  validate(params: any): boolean {
    try {
      // Convert JSON Schema to Zod schema for validation
      const zodSchema = this.jsonSchemaToZod(this.inputSchema);
      zodSchema.parse(params);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Register this tool with an MCP server
   * Stub method for MCP server integration
   * @param _server - MCP server instance (will be implemented in task 4)
   */
  register(_server: any): void {
    // Stub implementation - will be completed when MCPServer is implemented
    // This method will call server.registerTool(this)
  }

  /**
   * Convert JSON Schema to Zod schema for runtime validation
   * @param schema - JSON Schema object
   * @returns Zod schema object
   */
  private jsonSchemaToZod(schema: any): z.ZodType<any> {
    if (schema.type === 'object') {
      const shape: Record<string, z.ZodType<any>> = {};
      
      for (const [key, prop] of Object.entries(schema.properties || {})) {
        const propSchema = prop as any;
        let zodProp = this.convertPropertyToZod(propSchema);
        
        // Make optional if not in required array
        if (!schema.required?.includes(key)) {
          zodProp = zodProp.optional();
        }
        
        shape[key] = zodProp;
      }
      
      return z.object(shape);
    }
    
    return z.any();
  }

  /**
   * Convert a single JSON Schema property to Zod type
   * @param prop - JSON Schema property definition
   * @returns Zod type
   */
  private convertPropertyToZod(prop: any): z.ZodType<any> {
    switch (prop.type) {
      case 'string':
        return z.string();
      case 'number':
        return z.number();
      case 'boolean':
        return z.boolean();
      case 'array':
        if (prop.items) {
          return z.array(this.convertPropertyToZod(prop.items));
        }
        return z.array(z.any());
      case 'object':
        if (prop.properties) {
          const shape: Record<string, z.ZodType<any>> = {};
          for (const [key, nestedProp] of Object.entries(prop.properties)) {
            shape[key] = this.convertPropertyToZod(nestedProp);
          }
          return z.object(shape);
        }
        return z.record(z.any());
      default:
        return z.any();
    }
  }
}
