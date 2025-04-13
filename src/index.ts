import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// Find and load .env file
const possiblePaths = [
  join(process.cwd(), '.env'),
  join(__dirname, '../.env'),
  join(__dirname, '../../.env'),
  join(__dirname, '../ClaimsProcessingAssistant-MCP/.env'),
  join(process.cwd(), 'ClaimsProcessingAssistant-MCP/.env'),
];

let envPath;
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    envPath = path;
    break;
  }
}

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Now import the rest of the modules after environment variables are loaded
import { MCPServer } from './server/mcpServer';
import { MCPConfig } from './config/mcp.config';
import { createServer } from 'http';
import { parse } from 'url';
import {
  submitClaimFunction,
  validateClaimFunction,
  getClaimStatusFunction,
  listClaimsFunction,
} from './functions/claims';
import { supabase } from './config/supabase.config';
import { ClaimFunction } from './functions/claims';

// Verify JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not found in environment variables!');
  console.error('Current environment variables:', Object.keys(process.env));
  console.error('Current working directory:', process.cwd());
  console.error('__dirname:', __dirname);
  process.exit(1);
}

// Create MCP server instance
const mcpServer = new MCPServer();

// Register claim functions
const context = {
  supabase,
  user: null, // Will be set from auth token
};

// Helper to type the function parameters
const wrapHandler = (fn: ClaimFunction) => (params: Parameters<typeof fn.handler>[0]) =>
  fn.handler(params, context);

mcpServer.registerFunction(submitClaimFunction.name, wrapHandler(submitClaimFunction));
mcpServer.registerFunction(validateClaimFunction.name, wrapHandler(validateClaimFunction));
mcpServer.registerFunction(getClaimStatusFunction.name, wrapHandler(getClaimStatusFunction));
mcpServer.registerFunction(listClaimsFunction.name, wrapHandler(listClaimsFunction));

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    const { pathname } = parse(req.url || '');

    // Handle MCP function calls
    if (pathname === '/mcp' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
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
          res.end(
            JSON.stringify({
              success: false,
              error: 'Invalid request format',
            }),
          );
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
      res.end(
        JSON.stringify({
          success: false,
          error: 'Not found',
        }),
      );
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
    );
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
