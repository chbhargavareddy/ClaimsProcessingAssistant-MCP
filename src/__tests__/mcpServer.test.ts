import { MCPServer } from '../server/mcpServer';
import { MCPAuthHandler } from '../auth/mcpAuth';
import { MCPConfig } from '../config/mcp.config';

describe('MCPServer', () => {
  let server: MCPServer;
  let authHandler: MCPAuthHandler;

  beforeEach(() => {
    server = new MCPServer();
    authHandler = new MCPAuthHandler(MCPConfig.auth.secretKey);
  });

  it('should register and handle functions', async () => {
    // Register a test function
    const testFunction = jest.fn().mockResolvedValue({ result: 'success' });
    server.registerFunction('test', testFunction);

    // Create a valid auth payload
    const auth = authHandler.createAuth('test-token');

    // Create a test call
    const call = {
      functionName: 'test',
      parameters: { param: 'value' },
      requestId: 'test-request',
      auth,
    };

    // Handle the call
    const response = await server.handleCall(call);

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ result: 'success' });
    expect(response.requestId).toBe('test-request');
    expect(testFunction).toHaveBeenCalledWith({ param: 'value' });
  });

  it('should reject calls to non-existent functions', async () => {
    const auth = authHandler.createAuth('test-token');
    const call = {
      functionName: 'nonexistent',
      parameters: {},
      requestId: 'test-request',
      auth,
    };

    const response = await server.handleCall(call);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Function nonexistent not found');
    expect(response.requestId).toBe('test-request');
  });

  it('should reject calls with invalid auth', async () => {
    // Create an expired auth payload
    const auth = authHandler.createAuth('test-token');
    auth.timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

    const call = {
      functionName: 'test',
      parameters: {},
      requestId: 'test-request',
      auth,
    };

    const response = await server.handleCall(call);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Authentication failed');
    expect(response.requestId).toBe('test-request');
  });
});
