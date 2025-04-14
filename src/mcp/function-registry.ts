import { z } from 'zod';

export type FunctionHandler = (params: any) => Promise<any>;

interface RegisteredFunction {
  handler: FunctionHandler;
  schema: z.ZodSchema;
}

export class FunctionRegistry {
  private functions: Map<string, RegisteredFunction>;

  constructor() {
    this.functions = new Map();
  }

  register(name: string, handler: FunctionHandler, schema: z.ZodSchema): void {
    this.functions.set(name, { handler, schema });
  }

  get(name: string): RegisteredFunction | undefined {
    return this.functions.get(name);
  }

  validateParams(name: string, params: any): z.SafeParseReturnType<any, any> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }
    return fn.schema.safeParse(params);
  }

  protected getRequiredParams(schema: z.ZodSchema): string[] {
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      return Object.entries(shape)
        .filter(([, value]) => {
          // Check if the field is required
          return !(value instanceof z.ZodOptional);
        })
        .map(([key]) => key);
    }
    return [];
  }

  async execute(name: string, params: any): Promise<any> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    const validationResult = this.validateParams(name, params);
    if (!validationResult.success) {
      throw new Error(`Invalid parameters: ${validationResult.error.message}`);
    }

    return await fn.handler(validationResult.data);
  }
}
