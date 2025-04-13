import { MCPConfig, MCPFunctionCall, MCPResponse } from '../config/mcp.config';
import { MCPAuthHandler, MCPAuthError } from '../auth/mcpAuth';
import { EventEmitter } from 'events';

export class MCPServer extends EventEmitter {
  private functions: Map<string, Function>;
  private authHandler: MCPAuthHandler;

  constructor() {
    super();
    this.functions = new Map();
    this.authHandler = new MCPAuthHandler(MCPConfig.auth.secretKey);
  }

  /**
   * Register a function that can be called via MCP
   */
  public registerFunction(name: string, handler: Function): void {
    this.functions.set(name, handler);
  }

  /**
   * Handle an incoming MCP function call
   */
  public async handleCall(call: MCPFunctionCall): Promise<MCPResponse> {
    try {
      // Validate authentication
      if (MCPConfig.auth.requireAuth && !this.authHandler.validateAuth(call.auth)) {
        throw new MCPAuthError();
      }

      // Get the function handler
      const handler = this.functions.get(call.functionName);
      if (!handler) {
        throw new Error(`Function ${call.functionName} not found`);
      }

      // Set user context from auth token
      const context = {
        user: {
          id: call.auth.token, // Using token as user ID for now
          token: call.auth.token
        }
      };

      // Execute the function with context
      const result = await handler(call.parameters, context);

      // Return success response
      return {
        success: true,
        data: result,
        requestId: call.requestId,
      };
    } catch (error) {
      // Return error response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: call.requestId,
      };
    }
  }

  /**
   * Start the MCP server
   */
  public start(): void {
    this.emit('started', {
      version: MCPConfig.version,
      serverName: MCPConfig.serverName,
      functions: Array.from(this.functions.keys()),
    });
  }

  /**
   * Stop the MCP server
   */
  public stop(): void {
    this.emit('stopped');
  }
}