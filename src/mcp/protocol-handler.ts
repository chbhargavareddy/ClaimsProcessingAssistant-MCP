interface Message {
  type: string;
  requestId?: string;
  function?: string;
  params?: any;
  error?: string;
}

export class ProtocolHandler {
  handleMessage(messageStr: string): Message {
    try {
      const message = JSON.parse(messageStr) as Message;

      if (message.type === 'request') {
        if (!message.requestId || !message.function) {
          return {
            type: 'error',
            error: 'Invalid request: missing requestId or function',
          };
        }

        return {
          type: 'response',
          requestId: message.requestId,
        };
      }

      return {
        type: 'error',
        error: `Unsupported message type: ${message.type}`,
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
