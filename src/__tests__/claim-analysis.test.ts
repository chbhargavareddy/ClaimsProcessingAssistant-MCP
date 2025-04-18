import { Anthropic } from '@anthropic-ai/sdk';
import {
  analyzeClaimHandler,
  validateDocumentsHandler,
  AnalyzeClaimSchema,
  ValidateDocumentsSchema,
} from '../mcp/functions/claim-analysis';

// Mock the entire Anthropic module
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  return {
    Anthropic: jest.fn(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

describe('Claim Analysis Functions', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate = new Anthropic().messages.create as jest.Mock;
  });

  describe('analyzeClaimHandler', () => {
    const validClaimData = {
      claim: {
        id: 'CLAIM-123',
        type: 'auto' as const,
        description: 'Front bumper damage from parking accident',
        amount: 2500,
        date: '2024-03-20',
        claimant: {
          name: 'John Doe',
          policyNumber: 'POL-123-456',
          contactInfo: {
            email: 'john@example.com',
            phone: '555-0123',
          },
        },
        incident: {
          location: 'Shopping Mall Parking Lot',
          time: '14:30',
          witnesses: ['Security Guard'],
        },
        previousClaims: [],
      },
    };

    it('should validate claim data against schema', () => {
      const result = AnalyzeClaimSchema.safeParse(validClaimData);
      expect(result.success).toBe(true);
    });

    it('should successfully analyze a claim', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              validity: {
                status: 'valid',
                confidence: 0.95,
                reasons: ['Claim amount reasonable for damage type'],
              },
              riskFactors: [
                {
                  type: 'minor_collision',
                  severity: 'low',
                  description: 'Low-speed parking lot incident',
                },
              ],
              recommendedActions: [
                {
                  action: 'Request repair estimate',
                  priority: 'normal',
                  assignee: 'claims_adjuster',
                },
              ],
              fraudIndicators: {
                score: 0.1,
                flags: [],
                details: 'No suspicious patterns detected',
              },
              processingPriority: 'normal',
              analysis: 'Standard auto claim with clear documentation',
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await analyzeClaimHandler(validClaimData);

      expect(result).toMatchObject({
        validity: expect.objectContaining({
          status: 'valid',
          confidence: expect.any(Number),
        }),
        riskFactors: expect.arrayContaining([
          expect.objectContaining({
            severity: expect.stringMatching(/^(high|medium|low)$/),
          }),
        ]),
        processingPriority: expect.stringMatching(/^(urgent|high|normal|low)$/),
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('analyze this insurance claim'),
            }),
          ]),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));
      await expect(analyzeClaimHandler(validClaimData)).rejects.toThrow('Failed to analyze claim');
    });

    it('should reject invalid claim data', () => {
      const invalidData = {
        claim: {
          // Missing required fields
          id: 'CLAIM-123',
        },
      };

      const result = AnalyzeClaimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate date format', () => {
      const invalidDateData = {
        ...validClaimData,
        claim: {
          ...validClaimData.claim,
          date: '20-03-2024', // Wrong format
        },
      };

      const result = AnalyzeClaimSchema.safeParse(invalidDateData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateDocumentsHandler', () => {
    const validDocuments = {
      documents: [
        {
          type: 'police_report' as const,
          content: 'Accident report details...',
          date: '2024-03-20',
          signatures: ['Officer Smith'],
          metadata: {
            source: 'Local Police Department',
            verified: true,
            pageCount: 2,
          },
        },
      ],
    };

    it('should validate documents against schema', () => {
      const result = ValidateDocumentsSchema.safeParse(validDocuments);
      expect(result.success).toBe(true);
    });

    it('should successfully validate documents', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              completeness: {
                status: 'complete',
                missingElements: [],
                score: 1.0,
              },
              consistency: {
                status: 'consistent',
                issues: [],
                details: 'All information aligns',
              },
              signatures: {
                valid: true,
                verified: ['Officer Smith'],
                missing: [],
              },
              dates: {
                valid: true,
                issues: [],
              },
              suspiciousPatterns: {
                detected: false,
                flags: [],
                riskLevel: 'low',
              },
              quality: {
                score: 0.95,
                issues: [],
              },
              validation: 'All documents are complete and valid',
            }),
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await validateDocumentsHandler(validDocuments);

      expect(result).toMatchObject({
        completeness: expect.objectContaining({
          status: expect.stringMatching(/^(complete|incomplete|needs_review)$/),
          score: expect.any(Number),
        }),
        consistency: expect.objectContaining({
          status: expect.stringMatching(/^(consistent|inconsistent|needs_review)$/),
        }),
        quality: expect.objectContaining({
          score: expect.any(Number),
        }),
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('validate these claim documents'),
            }),
          ]),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));
      await expect(validateDocumentsHandler(validDocuments)).rejects.toThrow(
        'Failed to validate documents',
      );
    });

    it('should reject invalid document data', () => {
      const invalidData = {
        documents: [
          {
            type: 'other' as const,
            content: '', // Missing proper content
            date: 'invalid-date', // Invalid date format
            signatures: [], // Empty signatures
            metadata: {
              source: '', // Missing source
              verified: false,
              pageCount: -1, // Invalid page count
            },
          },
        ],
      };

      const result = ValidateDocumentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should validate document date format', () => {
      const invalidDateData = {
        documents: [
          {
            ...validDocuments.documents[0],
            date: '20-03-2024', // Wrong format
          },
        ],
      };

      const result = ValidateDocumentsSchema.safeParse(invalidDateData);
      expect(result.success).toBe(false);
    });
  });
});
