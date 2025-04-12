import { MCPAuthHandler, MCPAuthError } from '../auth/mcpAuth';

describe('MCPAuthHandler', () => {
  const secretKey = 'test-secret-key';
  const handler = new MCPAuthHandler(secretKey);

  it('should create valid auth payload', () => {
    const token = 'test-token';
    const auth = handler.createAuth(token);

    expect(auth).toHaveProperty('token', token);
    expect(auth).toHaveProperty('timestamp');
    expect(auth).toHaveProperty('signature');
  });

  it('should validate correct auth payload', () => {
    const token = 'test-token';
    const auth = handler.createAuth(token);
    
    const isValid = handler.validateAuth(auth);
    expect(isValid).toBe(true);
  });

  it('should reject expired auth payload', () => {
    const token = 'test-token';
    const auth = handler.createAuth(token);
    
    // Modify timestamp to be expired
    auth.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    
    const isValid = handler.validateAuth(auth);
    expect(isValid).toBe(false);
  });

  it('should reject tampered signature', () => {
    const token = 'test-token';
    const auth = handler.createAuth(token);
    
    // Modify signature
    auth.signature = 'tampered-signature';
    
    const isValid = handler.validateAuth(auth);
    expect(isValid).toBe(false);
  });
});