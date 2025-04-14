import { createHmac } from 'crypto';
import { MCPAuth } from '../config/mcp.config';

export class MCPAuthHandler {
  private secretKey: string;
  private tokenExpiration: number;

  constructor(secretKey: string, tokenExpirationHours: number = 24) {
    if (!secretKey) {
      throw new Error('secretKey is required for MCPAuthHandler');
    }

    this.secretKey = secretKey;
    this.tokenExpiration = tokenExpirationHours * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Validate the MCP authentication payload
   */
  public validateAuth(auth: MCPAuth): boolean {
    try {
      // Debug logging
      console.log('Validating auth:', {
        receivedSignature: auth.signature,
        timestamp: auth.timestamp,
        token: auth.token,
        secretFirstChars: this.secretKey.substring(0, 10),
      });

      // Check if the token has expired
      const currentTime = Date.now();
      if (currentTime - auth.timestamp > this.tokenExpiration) {
        console.log('Token expired:', {
          currentTime,
          timestamp: auth.timestamp,
          diff: currentTime - auth.timestamp,
        });
        return false;
      }

      // Verify the signature
      const expectedSignature = this.generateSignature(auth.token, auth.timestamp);
      console.log('Signature comparison:', {
        expected: expectedSignature,
        received: auth.signature,
        match: expectedSignature === auth.signature,
      });
      return expectedSignature === auth.signature;
    } catch (error) {
      console.error('Auth validation error:', error);
      return false;
    }
  }

  /**
   * Generate a signature for the given token and timestamp
   */
  private generateSignature(token: string, timestamp: number): string {
    const hmac = createHmac('sha256', this.secretKey);
    hmac.update(`${token}:${timestamp}`);
    return hmac.digest('hex');
  }

  /**
   * Create a new authentication payload
   */
  public createAuth(token: string): MCPAuth {
    const timestamp = Date.now();
    const signature = this.generateSignature(token, timestamp);
    return {
      token,
      timestamp,
      signature,
    };
  }
}

// Error class for authentication failures
export class MCPAuthError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'MCPAuthError';
  }
}
