import { FunctionRegistry } from '../../mcp/function-registry';
import { z } from 'zod';

describe('FunctionRegistry', () => {
  let registry: FunctionRegistry;

  beforeEach(() => {
    registry = new FunctionRegistry();
  });

  it('should register and retrieve functions', () => {
    const testFunction = jest.fn();
    const schema = z.object({
      param: z.string(),
    });

    registry.register('test', testFunction, schema);
    const retrieved = registry.get('test');

    expect(retrieved).toBeDefined();
    expect(retrieved?.handler).toBe(testFunction);
    expect(retrieved?.schema).toBe(schema);
  });

  it('should validate function parameters', () => {
    const testFunction = jest.fn();
    const schema = z.object({
      param: z.string(),
    });

    registry.register('test', testFunction, schema);
    const result = registry.validateParams('test', { param: 'value' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ param: 'value' });
    }
  });

  it('should handle validation errors', () => {
    const testFunction = jest.fn();
    const schema = z.object({
      param: z.string(),
    });

    registry.register('test', testFunction, schema);
    const result = registry.validateParams('test', { param: 123 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('should check required parameters', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const requiredParams = registry['getRequiredParams'](schema);
    expect(requiredParams).toContain('required');
    expect(requiredParams).not.toContain('optional');
  });
});
