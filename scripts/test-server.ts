const { MCPAuthHandler } = require('../src/auth/mcpAuth');
const { MCPConfig } = require('../src/config/mcp.config');
const nodeFetch = require('node-fetch');

async function testServer() {
  try {
    // Create auth payload
    const authHandler = new MCPAuthHandler(MCPConfig.auth.secretKey);
    const auth = authHandler.createAuth('test-token');

    // Create test request
    const response = await nodeFetch(`http://localhost:${MCPConfig.port}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        functionName: 'getClaim',
        parameters: { id: 'test-claim-id' },
        requestId: 'test-request',
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