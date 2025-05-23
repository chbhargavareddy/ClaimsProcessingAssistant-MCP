import { z } from 'zod';

export const MCPConfig = {
  version: '1.0.0',
  serverName: 'ClaimsProcessingAssistant-MCP',
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  auth: {
    requireAuth: true,
    tokenExpiration: '24h',
    secretKey: (() => {
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable is required but not found!');
        process.exit(1);
      }
      // Decode the JWT_SECRET to handle + characters correctly
      return decodeURIComponent(process.env.JWT_SECRET.replace(/\+/g, '%2B'));
    })(),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
};

// Schema for MCP authentication payload
export const MCPAuthSchema = z.object({
  token: z.string(),
  timestamp: z.number(),
  signature: z.string(),
});

// Schema for MCP function call
export const MCPFunctionCallSchema = z.object({
  functionName: z.string(),
  parameters: z.record(z.any()),
  requestId: z.string(),
  auth: MCPAuthSchema,
});

// Schema for MCP response
export const MCPResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  requestId: z.string(),
});

export type MCPAuth = z.infer<typeof MCPAuthSchema>;
export type MCPFunctionCall = z.infer<typeof MCPFunctionCallSchema>;
export type MCPResponse = z.infer<typeof MCPResponseSchema>;
