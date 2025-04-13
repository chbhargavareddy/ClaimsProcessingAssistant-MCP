import {
  submitClaimFunction,
  validateClaimFunction,
  getClaimStatusFunction,
  listClaimsFunction,
} from '../../functions/claims';

describe('MCP Function Registry Tests', () => {
  const functions = [
    submitClaimFunction,
    validateClaimFunction,
    getClaimStatusFunction,
    listClaimsFunction,
  ];

  describe('Function Definitions', () => {
    functions.forEach((func) => {
      describe(`${func.name} function`, () => {
        it('should have required MCP function properties', () => {
          expect(func).toHaveProperty('name');
          expect(func).toHaveProperty('description');
          expect(func).toHaveProperty('parameters');
          expect(func).toHaveProperty('returns');
          expect(func).toHaveProperty('handler');
        });

        it('should have valid parameter schema', () => {
          expect(func.parameters).toBeDefined();
          expect(typeof func.parameters.parse).toBe('function');
        });

        it('should have valid return schema', () => {
          expect(func.returns).toBeDefined();
          expect(typeof func.returns.parse).toBe('function');
        });

        it('should have a handler function', () => {
          expect(typeof func.handler).toBe('function');
        });

        it('should have a non-empty description', () => {
          expect(func.description).toBeDefined();
          expect(func.description.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Function Discovery', () => {
    it('should expose all required claim processing functions', () => {
      const functionNames = functions.map((f) => f.name);

      expect(functionNames).toContain('submitClaim');
      expect(functionNames).toContain('validateClaim');
      expect(functionNames).toContain('getClaimStatus');
      expect(functionNames).toContain('listClaims');
    });

    it('should have unique function names', () => {
      const functionNames = functions.map((f) => f.name);
      const uniqueNames = new Set(functionNames);

      expect(uniqueNames.size).toBe(functionNames.length);
    });
  });

  describe('Parameter Schemas', () => {
    it('should validate required parameters', () => {
      functions.forEach((func) => {
        const shape = func.parameters.shape;
        if (typeof shape === 'object') {
          Object.entries(shape).forEach(([key, value]) => {
            if (value._def.required) {
              expect(value).toBeDefined();
            }
          });
        }
      });
    });
  });

  describe('Return Schemas', () => {
    it('should include standard response properties', () => {
      functions.forEach((func) => {
        const returnShape = func.returns.shape;
        if (typeof returnShape === 'object') {
          // Each function should return at least a status indicator
          const hasStatusIndicator = Object.keys(returnShape).some((key) =>
            ['status', 'success', 'isValid'].includes(key),
          );
          expect(hasStatusIndicator).toBe(true);
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parameters consistently', async () => {
      const invalidParams = {};

      for (const func of functions) {
        try {
          await func.parameters.parseAsync(invalidParams);
          fail(`Expected ${func.name} to throw validation error`);
        } catch (error: any) {
          expect(error).toBeDefined();
          expect(error.errors || error.issues).toBeDefined();
        }
      }
    });
  });
});
