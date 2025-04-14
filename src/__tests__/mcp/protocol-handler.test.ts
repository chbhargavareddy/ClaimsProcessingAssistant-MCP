import { ProtocolHandler } from '../../mcp/protocol-handler';

describe('ProtocolHandler', () => {
  let handler: ProtocolHandler;

  beforeEach(() => {
    handler = new ProtocolHandler();
  });

  it('should handle valid messages', () => {
    const message = {
      type: 'request',
      requestId: 'test-id',
      function: 'test-function',
      params: { test: 'value' },
    };

    const result = handler.handleMessage(JSON.stringify(message));
    expect(result).toMatchObject({
      type: 'response',
      requestId: 'test-id',
    });
  });

  it('should handle invalid messages', () => {
    const message = {
      type: 'invalid',
      data: 'test',
    };

    const result = handler.handleMessage(JSON.stringify(message));
    expect(result).toMatchObject({
      type: 'error',
      error: expect.any(String),
    });
  });

  it('should handle malformed JSON', () => {
    const result = handler.handleMessage('invalid json');
    expect(result).toMatchObject({
      type: 'error',
      error: expect.stringContaining('Failed to parse message'),
    });
  });

  it('should handle missing required fields', () => {
    const message = {
      type: 'request',
      // Missing requestId and function
      params: { test: 'value' },
    };

    const result = handler.handleMessage(JSON.stringify(message));
    expect(result).toMatchObject({
      type: 'error',
      error: expect.stringContaining('missing requestId or function'),
    });
  });
});
