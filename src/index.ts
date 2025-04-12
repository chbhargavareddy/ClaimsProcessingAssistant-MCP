import { z } from 'zod';
import { supabase } from './config/supabase';
import { Claim, ClaimStatus } from './types/claim';
interface MCPRequest {
  function: string;
  parameters: Record<string, unknown>;
}
interface MCPResponse {
  result?: unknown;
  error?: { message: string };
}
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  try {
    switch (request.function) {
      case 'readClaims': {
        const schema = z.object({
          status: z.enum(['pending', 'approved', 'rejected'] as const).optional(),
          limit: z.number().min(1).max(100).optional(),
          offset: z.number().min(0).optional(),
        });
        const { status, limit = 10, offset = 0 } = schema.parse(request.parameters);
        const query = supabase.from('claims').select('*');
        if (status) {
          query.eq('status', status);
        }
        const { data, error } = await query.range(offset, offset + limit - 1);
        if (error) throw error;
        return { result: data };
      }
      case 'createClaim': {
        const schema = z.object({
          policy_number: z.string(),
          claimant_name: z.string(),
          claim_type: z.string(),
          claim_amount: z.number(),
          status: z.enum(['pending', 'approved', 'rejected'] as const).default('pending'),
        });
        const claim = schema.parse(request.parameters);
        const { data, error } = await supabase.from('claims').insert([claim]).select();
        if (error) throw error;
        return { result: data[0] };
      }
      case 'updateClaim': {
        const schema = z.object({
          id: z.string(),
          updates: z.object({
            status: z.enum(['pending', 'approved', 'rejected'] as const).optional(),
            claim_amount: z.number().optional(),
          }),
        });
        const { id, updates } = schema.parse(request.parameters);
        const { data, error } = await supabase.from('claims').update(updates).eq('id', id).select();
        if (error) throw error;
        return { result: data[0] };
      }
      case 'deleteClaim': {
        const schema = z.object({ id: z.string() });
        const { id } = schema.parse(request.parameters);
        const { error } = await supabase.from('claims').delete().eq('id', id);
        if (error) throw error;
        return { result: { success: true } };
      }
      default:
        throw new Error(`Unknown function: ${request.function}`);
    }
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
  }
}
process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    try {
      const request = JSON.parse(line) as MCPRequest;
      handleRequest(request).then((response) => {
        process.stdout.write(JSON.stringify(response) + '\n');
      });
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: { message: 'Invalid request format' } }) + '\n');
    }
  }
});
process.stdin.on('end', () => {
  if (buffer) {
    try {
      const request = JSON.parse(buffer) as MCPRequest;
      handleRequest(request).then((response) => {
        process.stdout.write(JSON.stringify(response) + '\n');
      });
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: { message: 'Invalid request format' } }) + '\n');
    }
  }
});
