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
    server.register('test-function', testFunction, testSchema);
  });

  it('should register and handle functions', async () => {
    const request = {
      type: 'request',
      requestId: 'test-request',
      function: 'test-function',
      params: { param: 'value' },
      token: 'test-token',
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
      function: 'non-existent',
      params: {},
      token: 'test-token',
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
      function: 'test-function',
      params: { param: 123 }, // Wrong type
      token: 'test-token',
    };

    const response = await server.handleMessage(JSON.stringify(request));
    const parsedResponse = JSON.parse(response);

    expect(parsedResponse.type).toBe('error');
    expect(parsedResponse.error).toContain('Invalid parameters');
  });
});
