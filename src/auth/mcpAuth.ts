import { createHmac } from 'crypto';
import { MCPAuth } from '../config/mcp.config';

export class MCPAuthHandler {
  private secretKey: string;
  private tokenExpiration: number;

  constructor(secretKey: string, tokenExpirationHours: number = 24) {
    this.secretKey = secretKey;
    this.tokenExpiration = tokenExpirationHours * 60 * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Validate the MCP authentication payload
   */
  public validateAuth(auth: MCPAuth): boolean {
    try {
      // Check if the token has expired
      const currentTime = Date.now();
      if (currentTime - auth.timestamp > this.tokenExpiration) {
        return false;
      }

      // Verify the signature
      const expectedSignature = this.generateSignature(auth.token, auth.timestamp);
      return expectedSignature === auth.signature;
    } catch (error) {
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