import { FunctionRegistry } from '../../mcp/function-registry';
import { z } from 'zod';

describe('FunctionRegistry', () => {
  let registry: FunctionRegistry;

  beforeEach(() => {
    registry = new FunctionRegistry();
  });

  describe('register and get', () => {
    it('should register and retrieve a function', () => {
      const handler = jest.fn();
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);
      const fn = registry.get('testFn');

      expect(fn).toBeDefined();
      expect(fn?.handler).toBe(handler);
      expect(fn?.schema).toBe(schema);
    });

    it('should return undefined for non-existent function', () => {
      const fn = registry.get('nonExistent');
      expect(fn).toBeUndefined();
    });
  });

  describe('validateParams', () => {
    it('should validate parameters successfully', () => {
      const handler = jest.fn();
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);
      const result = registry.validateParams('testFn', { test: 'value' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ test: 'value' });
      }
    });

    it('should fail validation for invalid parameters', () => {
      const handler = jest.fn();
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);
      const result = registry.validateParams('testFn', { test: 123 });

      expect(result.success).toBe(false);
    });

    it('should throw error for non-existent function', () => {
      expect(() => {
        registry.validateParams('nonExistent', {});
      }).toThrow('Function nonExistent not found');
    });
  });

  describe('execute', () => {
    it('should execute function with valid parameters', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);
      const result = await registry.execute('testFn', { test: 'value' });

      expect(result).toBe('result');
      expect(handler).toHaveBeenCalledWith({ test: 'value' });
    });

    it('should throw error for non-existent function', async () => {
      await expect(registry.execute('nonExistent', {})).rejects.toThrow(
        'Function nonExistent not found',
      );
    });

    it('should throw error for invalid parameters', async () => {
      const handler = jest.fn();
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);

      await expect(registry.execute('testFn', { test: 123 })).rejects.toThrow('Invalid parameters');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle function execution errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Execution failed'));
      const schema = z.object({ test: z.string() });

      registry.register('testFn', handler, schema);

      await expect(registry.execute('testFn', { test: 'value' })).rejects.toThrow(
        'Execution failed',
      );
    });
  });

  describe('getRequiredParams', () => {
    it('should return required parameters from schema', () => {
      const handler = jest.fn();
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });

      registry.register('testFn', handler, schema);
      const fn = registry.get('testFn');

      // Access protected method through type assertion
      const requiredParams = (registry as any).getRequiredParams(fn!.schema);
      expect(requiredParams).toEqual(['required']);
    });

    it('should return empty array for non-object schema', () => {
      const handler = jest.fn();
      const schema = z.string();

      registry.register('testFn', handler, schema);
      const fn = registry.get('testFn');

      // Access protected method through type assertion
      const requiredParams = (registry as any).getRequiredParams(fn!.schema);
      expect(requiredParams).toEqual([]);
    });
  });
});
