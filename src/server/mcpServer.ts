import { z } from 'zod';
import { MCPRequest } from '../types/mcp';

interface RegisteredFunction {
  handler: (params: any) => Promise<any>;
  schema: z.ZodSchema;
}

interface MCPMessage {
  type: 'request';
  requestId: string;
  functionName: string;
  parameters: any;
  auth: {
    token: string;
  };
}

export class MCPServer {
  private functions: Map<string, RegisteredFunction>;
  private isRunning: boolean;

  constructor() {
    this.functions = new Map();
    this.isRunning = false;
  }

  registerFunction(name: string, handler: (params: any) => Promise<any>, schema: z.ZodSchema) {
    this.functions.set(name, { handler, schema });
  }

  async handleCall(call: MCPRequest) {
    try {
      const { functionName, parameters } = call;

      // Check if function exists
      const fn = this.functions.get(functionName);
      if (!fn) {
        throw new Error(`Function ${functionName} not found`);
      }

      // Validate parameters
      const validatedParams = fn.schema.parse(parameters);

      // Execute function
      const result = await fn.handler(validatedParams);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleMessage(messageStr: string): Promise<string> {
    try {
      const message = JSON.parse(messageStr) as MCPMessage;

      if (message.type !== 'request') {
        return JSON.stringify({
          type: 'error',
          requestId: message.requestId,
          error: 'Invalid message type',
        });
      }

      const fn = this.functions.get(message.functionName);
      if (!fn) {
        return JSON.stringify({
          type: 'error',
          requestId: message.requestId,
          error: `Function ${message.functionName} not found`,
        });
      }

      // Validate parameters
      const validatedParams = fn.schema.parse({
        ...message.parameters,
        user: {
          id: message.auth.token,
          token: message.auth.token,
        },
      });

      // Execute function
      const result = await fn.handler(validatedParams);

      return JSON.stringify({
        type: 'response',
        requestId: message.requestId,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return JSON.stringify({
          type: 'error',
          requestId: (error as any).requestId || 'unknown',
          error: 'Invalid parameters: ' + JSON.stringify(error.errors),
        });
      }
      return JSON.stringify({
        type: 'error',
        requestId: (error as any).requestId || 'unknown',
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  start() {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }
    this.isRunning = true;
    console.log('MCP Server started successfully');
  }

  stop() {
    if (!this.isRunning) {
      throw new Error('Server is not running');
    }
    this.isRunning = false;
    console.log('MCP Server stopped successfully');
  }
}