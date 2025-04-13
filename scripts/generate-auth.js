import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables from the correct path
dotenv.config({ path: '.env' });

// Get the JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env file');
  process.exit(1);
}

const timestamp = Date.now(); // Current timestamp in milliseconds
const token = 'test-token';
const message = `${token}:${timestamp}`;

// Generate HMAC-SHA256 signature
const signature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('hex');

// Output the auth payload
console.log(
  JSON.stringify(
    {
      token,
      timestamp,
      signature,
      message, // Including message for verification
    },
    null,
    2,
  ),
);
