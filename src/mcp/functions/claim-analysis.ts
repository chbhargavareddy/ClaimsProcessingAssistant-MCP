import { z } from 'zod';
import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../../config';

// Enum definitions
export const ClaimType = z.enum([
  'auto',
  'property',
  'health',
  'liability',
  'workers_comp',
  'other',
]);

export const ProcessingPriority = z.enum([
  'urgent', 'high', 'normal', 'low',
]);

export const DocumentType = z.enum([
  'police_report',
  'medical_report',
  'repair_estimate',
  'photos',
  'witness_statement',
  'invoice',
  'other',
]);

// Schema definitions
export const ClaimDataSchema = z.object({
  id: z.string().min(1),
  type: ClaimType,
  description: z.string().min(10),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claimant: z.object({
    name: z.string().min(1),
    policyNumber: z.string().min(1),
    contactInfo: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).optional(),
  }),
  incident: z.object({
    location: z.string().optional(),
    time: z.string().optional(),
    witnesses: z.array(z.string()).optional(),
  }).optional(),
  previousClaims: z.array(z.string()).optional(),
});

export const DocumentSchema = z.object({
  type: DocumentType,
  content: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signatures: z.array(z.string()).optional(),
  metadata: z.object({
    source: z.string().optional(),
    verified: z.boolean().optional(),
    pageCount: z.number().optional(),
  }).optional(),
});

// Response types
export const ClaimAnalysisResponse = z.object({
  validity: z.object({
    status: z.enum(['valid', 'invalid', 'needs_review']),
    confidence: z.number().min(0).max(1),
    reasons: z.array(z.string()),
  }),
  riskFactors: z.array(z.object({
    type: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
    description: z.string(),
  })),
  recommendedActions: z.array(z.object({
    action: z.string(),
    priority: ProcessingPriority,
    assignee: z.string().optional(),
  })),
  fraudIndicators: z.object({
    score: z.number().min(0).max(1),
    flags: z.array(z.string()),
    details: z.string().optional(),
  }),
  processingPriority: ProcessingPriority,
  analysis: z.string(),
  timestamp: z.string(),
});

export const DocumentValidationResponse = z.object({
  completeness: z.object({
    status: z.enum(['complete', 'incomplete', 'needs_review']),
    missingElements: z.array(z.string()),
    score: z.number().min(0).max(1),
  }),
  consistency: z.object({
    status: z.enum(['consistent', 'inconsistent', 'needs_review']),
    issues: z.array(z.string()),
    details: z.string().optional(),
  }),
  signatures: z.object({
    valid: z.boolean(),
    verified: z.array(z.string()),
    missing: z.array(z.string()),
  }),
  dates: z.object({
    valid: z.boolean(),
    issues: z.array(z.string()),
  }),
  suspiciousPatterns: z.object({
    detected: z.boolean(),
    flags: z.array(z.string()),
    riskLevel: z.enum(['high', 'medium', 'low']),
  }),
  quality: z.object({
    score: z.number().min(0).max(1),
    issues: z.array(z.string()),
  }),
  validation: z.string(),
  timestamp: z.string(),
});

// MCP Function Schemas
export const AnalyzeClaimSchema = z.object({
  claim: ClaimDataSchema,
});

export const ValidateDocumentsSchema = z.object({
  documents: z.array(DocumentSchema),
});

// Helper function to get claim type specific prompts
function getClaimTypePrompt(claimType: z.infer<typeof ClaimType>): string {
  const prompts: Record<z.infer<typeof ClaimType>, string> = {
    auto: `Consider:
- Vehicle damage assessment
- Accident circumstances
- Driver history
- Repair cost reasonableness`,
    property: `Consider:
- Property value assessment
- Damage extent
- Previous property claims
- Local incident patterns`,
    health: `Consider:
- Medical necessity
- Treatment appropriateness
- Provider credentials
- Coverage limitations`,
    liability: `Consider:
- Liability determination
- Damage assessment
- Legal implications
- Settlement recommendations`,
    workers_comp: `Consider:
- Injury type and severity
- Work-relatedness
- Return-to-work timeline
- Treatment plan`,
    other: `Consider:
- Claim specifics
- Coverage verification
- Risk assessment
- Processing requirements`,
  };
  return prompts[claimType];
}

// Claude client initialization
const claude = new Anthropic({
  apiKey: config.CLAUDE_API_KEY,
});

// MCP Function Handlers
export async function analyzeClaimHandler(params: z.infer<typeof AnalyzeClaimSchema>): Promise<z.infer<typeof ClaimAnalysisResponse>> {
  try {
    const typeSpecificPrompt = getClaimTypePrompt(params.claim.type);
    
    const message = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `As an expert claims processing assistant, analyze this insurance claim:
${JSON.stringify(params.claim, null, 2)}

${typeSpecificPrompt}

Provide a detailed structured analysis including:

1. Claim Validity Assessment
- Overall validity status
- Confidence level (0-1)
- Supporting reasons

2. Risk Factors
- Identify key risk factors
- Assess severity (high/medium/low)
- Provide detailed descriptions

3. Recommended Actions
- List specific actions needed
- Assign priorities (urgent/high/normal/low)
- Suggest assignees if applicable

4. Fraud Indicators
- Calculate fraud risk score (0-1)
- List any suspicious elements
- Provide detailed analysis

5. Processing Priority
- Determine overall priority level
- Consider claim type and amount
- Account for risk factors

Format the response as a structured JSON object matching this schema:
${JSON.stringify(ClaimAnalysisResponse.shape, null, 2)}`,
      }],
    });

    // Parse and validate the response
    const rawResponse = JSON.parse(message.content[0].text);
    return ClaimAnalysisResponse.parse({
      ...rawResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to analyze claim: ${errorMessage}`);
  }
}

export async function validateDocumentsHandler(params: z.infer<typeof ValidateDocumentsSchema>): Promise<z.infer<typeof DocumentValidationResponse>> {
  try {
    const message = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `As an expert claims processing assistant, validate these claim documents:
${JSON.stringify(params.documents, null, 2)}

Provide a comprehensive validation report including:

1. Document Completeness
- Check all required elements
- Calculate completeness score
- List any missing items

2. Information Consistency
- Cross-reference all documents
- Identify any discrepancies
- Verify date alignments

3. Signature Verification
- Validate all signatures
- List verified signatories
- Note any missing signatures

4. Date Validation
- Check all dates for validity
- Verify chronological order
- Flag any inconsistencies

5. Suspicious Pattern Detection
- Look for unusual patterns
- Assess risk level
- Document specific concerns

6. Quality Assessment
- Evaluate document quality
- Calculate quality score
- List any quality issues

Format the response as a structured JSON object matching this schema:
${JSON.stringify(DocumentValidationResponse.shape, null, 2)}`,
      }],
    });

    // Parse and validate the response
    const rawResponse = JSON.parse(message.content[0].text);
    return DocumentValidationResponse.parse({
      ...rawResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to validate documents: ${errorMessage}`);
  }
}