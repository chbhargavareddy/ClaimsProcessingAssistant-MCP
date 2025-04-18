import { MCPServer } from '../server/mcpServer';
import { z } from 'zod';

describe('MCPServer', () => {
  let server: MCPServer;
  const testFunction = jest.fn().mockResolvedValue({ result: 'success' });
  const testSchema = z.object({
    param: z.string(),
    user: z.object({
      id: z.string(),
      token: z.string(),
    }),
  });

  beforeEach(() => {
    server = new MCPServer();
    server.registerFunction('test-function', testFunction, testSchema);
  });

  it('should register and handle functions', async () => {
    const request = {
      type: 'request',
      requestId: 'test-request',
      functionName: 'test-function',
      parameters: { param: 'value' },
      auth: { token: 'test-token', timestamp: Date.now(), signature: 'test-signature' },
    };

    const response = await server.handleMessage(JSON.stringify(request));
    const parsedResponse = JSON.parse(response);

    expect(parsedResponse.type).toBe('response');
    expect(parsedResponse.data).toEqual({ result: 'success' });
    expect(parsedResponse.requestId).toBe('test-request');
    expect(testFunction).toHaveBeenCalledWith({
      param: 'value',
      user: { id: 'test-token', token: 'test-token' },
    });
  });

  it('should reject calls to non-existent functions', async () => {
    const request = {
      type: 'request',
      requestId: 'test-request',
      functionName: 'non-existent',
      parameters: {},
      auth: { token: 'test-token', timestamp: Date.now(), signature: 'test-signature' },
    };

    const response = await server.handleMessage(JSON.stringify(request));
    const parsedResponse = JSON.parse(response);

    expect(parsedResponse.type).toBe('error');
    expect(parsedResponse.error).toBe('Function non-existent not found');
  });

  it('should validate function parameters', async () => {
    const request = {
      type: 'request',
      requestId: 'test-request',
      functionName: 'test-function',
      parameters: { param: 123 }, // Wrong type
      auth: { token: 'test-token', timestamp: Date.now(), signature: 'test-signature' },
    };

    const response = await server.handleMessage(JSON.stringify(request));
    const parsedResponse = JSON.parse(response);

    expect(parsedResponse.type).toBe('error');
    expect(parsedResponse.error).toContain('Invalid parameters');
  });
});
