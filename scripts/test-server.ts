import { MCPAuthHandler } from '../src/auth/mcpAuth';
import { MCPConfig } from '../src/config/mcp.config';

async function testServer() {
  try {
    const fetch = (await import('node-fetch')).default;

    // Create auth payload
    const authHandler = new MCPAuthHandler(MCPConfig.auth.secretKey);
    const auth = authHandler.createAuth('test-token');

    // Log the auth payload for debugging
    console.log('Auth payload:', JSON.stringify(auth, null, 2));

    // Create test request
    const response = await fetch(`http://localhost:${MCPConfig.port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        functionName: 'listClaims',
        parameters: {
          status: 'pending',
          page: 1,
          limit: 10,
        },
        requestId: 'test-123',
        auth,
      }),
    });

    const result = await response.json();
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testServer();
