import { Anthropic } from '@anthropic-ai/sdk';
import {
  analyzeClaimHandler,
  validateDocumentsHandler,
  AnalyzeClaimSchema,
  ValidateDocumentsSchema
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
    mockCreate = (new Anthropic()).messages.create as jest.Mock;
  });

  describe('analyzeClaimHandler', () => {
    const validClaimData = {
      claim: {
        id: 'CLAIM-123',
        type: 'auto',
        description: 'Front bumper damage from parking accident',
        amount: 2500,
        date: '2024-03-20',
        claimant: {
          name: 'John Doe',
          policyNumber: 'POL-123-456'
        }
      }
    };

    it('should validate claim data against schema', () => {
      const result = AnalyzeClaimSchema.safeParse(validClaimData);
      expect(result.success).toBe(true);
    });

    it('should successfully analyze a claim', async () => {
      const mockResponse = {
        content: [{
          text: 'Claim Analysis:\n1. Validity: Valid\n2. Risk: Low\n3. Actions: Approve'
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await analyzeClaimHandler(validClaimData);
      
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('timestamp');
      expect(result.analysis).toBe(mockResponse.content[0].text);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('analyze this insurance claim')
            })
          ])
        })
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
          id: 'CLAIM-123'
        }
      };

      const result = AnalyzeClaimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateDocumentsHandler', () => {
    const validDocuments = {
      documents: [{
        type: 'police_report',
        content: 'Accident report details...',
        date: '2024-03-20',
        signatures: ['Officer Smith']
      }]
    };

    it('should validate documents against schema', () => {
      const result = ValidateDocumentsSchema.safeParse(validDocuments);
      expect(result.success).toBe(true);
    });

    it('should successfully validate documents', async () => {
      const mockResponse = {
        content: [{
          text: 'Document Validation:\n1. Completeness: Complete\n2. Consistency: Valid'
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await validateDocumentsHandler(validDocuments);
      
      expect(result).toHaveProperty('validation');
      expect(result).toHaveProperty('timestamp');
      expect(result.validation).toBe(mockResponse.content[0].text);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-sonnet-20240229',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('validate these claim documents')
            })
          ])
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      await expect(validateDocumentsHandler(validDocuments)).rejects.toThrow('Failed to validate documents');
    });

    it('should reject invalid document data', () => {
      const invalidData = {
        documents: [{
          // Missing required fields
          type: 'police_report'
        }]
      };

      const result = ValidateDocumentsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});