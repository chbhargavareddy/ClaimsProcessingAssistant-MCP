import { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../../config';

// Schema definitions
export const ClaimDataSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string(),
  claimant: z.object({
    name: z.string(),
    policyNumber: z.string(),
  }),
});

export const DocumentSchema = z.object({
  type: z.string(),
  content: z.string(),
  date: z.string(),
  signatures: z.array(z.string()).optional(),
});

// MCP Function Schemas
export const AnalyzeClaimSchema = z.object({
  claim: ClaimDataSchema,
});

export const ValidateDocumentsSchema = z.object({
  documents: z.array(DocumentSchema),
});

// Claude client initialization
const claude = new Anthropic({
  apiKey: config.CLAUDE_API_KEY,
});

// MCP Function Handlers
export async function analyzeClaimHandler(params: z.infer<typeof AnalyzeClaimSchema>) {
  try {
    const message = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `As a claims processing assistant, analyze this insurance claim:
${JSON.stringify(params.claim, null, 2)}

Provide a structured analysis including:
1. Claim Validity Assessment
2. Risk Factors
3. Recommended Actions
4. Potential Fraud Indicators
5. Processing Priority Level

Format the response in a clear, structured manner suitable for claims processing.`,
      }],
    });

    return {
      analysis: message.content[0].text,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to analyze claim: ${errorMessage}`);
  }
}

export async function validateDocumentsHandler(params: z.infer<typeof ValidateDocumentsSchema>) {
  try {
    const message = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `As a claims processing assistant, validate these claim documents:
${JSON.stringify(params.documents, null, 2)}

Provide a structured validation report including:
1. Document Completeness Check
2. Information Consistency Analysis
3. Required Signatures Verification
4. Date Validity Check
5. Suspicious Pattern Detection
6. Document Quality Assessment

Format the response in a clear, structured manner suitable for claims processing.`,
      }],
    });

    return {
      validation: message.content[0].text,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to validate documents: ${errorMessage}`);
  }
}