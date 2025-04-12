import { MCPServer } from './server/mcpServer';
import { MCPConfig } from './config/mcp.config';
import { createServer } from 'http';
import { parse } from 'url';

// Create MCP server instance
const mcpServer = new MCPServer();

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    const { pathname } = parse(req.url || '');

    // Handle MCP function calls
    if (pathname === '/mcp' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const call = JSON.parse(body);
          const response = await mcpServer.handleCall(call);
          
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': MCPConfig.cors.origin,
          });
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Invalid request format',
          }));
        }
      });
    }
    // Handle CORS preflight
    else if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': MCPConfig.cors.origin,
        'Access-Control-Allow-Methods': MCPConfig.cors.methods.join(', '),
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
    }
    // Handle unknown routes
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Not found',
      }));
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
    }));
  }
});

// Start server
server.listen(MCPConfig.port, () => {
  console.log(`MCP Server started on port ${MCPConfig.port}`);
  mcpServer.start();
});

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down MCP Server...');
  mcpServer.stop();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});