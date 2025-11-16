import { BaseTool } from './BaseTool';
import { ToolDefinition } from '../types';
import { Logger } from '../utils/Logger';

/**
 * MCP Server core component
 * Manages tool registration, discovery, and execution
 */
export class MCPServer {
  private tools: Map<string, BaseTool>;

  constructor() {
    this.tools = new Map<string, BaseTool>();
    Logger.debug('MCPServer initialized');
  }

  /**
   * Register a tool with the MCP server
   * @param tool - BaseTool instance to register
   * @throws Error if a tool with the same name is already registered
   */
  registerTool(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      const errorMsg = `Tool with name '${tool.name}' is already registered`;
      Logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.tools.set(tool.name, tool);
    Logger.info('Tool registered', { 
      toolName: tool.name, 
      description: tool.description 
    });
  }

  /**
   * List all registered tools
   * @returns Array of ToolDefinition objects for all registered tools
   */
  listTools(): ToolDefinition[] {
    const toolDefinitions = Array.from(this.tools.values()).map(tool => 
      tool.getToolDefinition()
    );
    
    Logger.debug('Tools listed', { count: toolDefinitions.length });
    
    return toolDefinitions;
  }

  /**
   * Execute a registered tool with the provided parameters
   * @param name - Name of the tool to execute
   * @param params - Parameters to pass to the tool
   * @returns Promise resolving to the tool's execution result
   * @throws Error if tool is not found or validation fails
   */
  async executeTool(name: string, params: any): Promise<any> {
    Logger.debug('Tool execution requested', { toolName: name, params });

    const tool = this.tools.get(name);
    
    if (!tool) {
      const errorMsg = `Tool '${name}' not found`;
      Logger.error(errorMsg, undefined, { availableTools: Array.from(this.tools.keys()) });
      throw new Error(errorMsg);
    }

    // Validate parameters before execution
    if (!tool.validate(params)) {
      const errorMsg = `Invalid parameters for tool '${name}'`;
      Logger.warning(errorMsg, { params, schema: tool.inputSchema });
      throw new Error(errorMsg);
    }

    try {
      Logger.info('Executing tool', { toolName: name });
      const result = await tool.execute(params);
      Logger.info('Tool execution completed', { toolName: name });
      return result;
    } catch (error) {
      const errorMsg = `Tool execution failed for '${name}'`;
      Logger.error(errorMsg, error as Error, { params });
      throw error;
    }
  }

  /**
   * Get the number of registered tools
   * @returns Number of tools currently registered
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Check if a tool is registered
   * @param name - Name of the tool to check
   * @returns true if the tool is registered, false otherwise
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }
}
