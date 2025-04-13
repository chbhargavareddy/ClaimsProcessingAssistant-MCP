import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Test values from the request
const testTimestamp = 1744508932374;
const testToken = 'test-token';
const jwtSecret = process.env.JWT_SECRET;

// Generate signature the same way server does
const message = `${testToken}:${testTimestamp}`;
const serverSignature = crypto.createHmac('sha256', jwtSecret).update(message).digest('hex');

console.log('Test Values:');
console.log('------------');
console.log('Token:', testToken);
console.log('Timestamp:', testTimestamp);
console.log('JWT Secret:', jwtSecret);
console.log('Message:', message);
console.log('Expected Signature:', serverSignature);
console.log(
  '\nYour Signature:   ',
  '7aecf9be43c03917feece55d94744eb1688f50bc403860ac82486394100228d7',
);
