import { v4 as uuidv4 } from 'uuid';
import { Claim } from '../../types/claim';
import { Document } from '../../types/document';

export const createTestClaim = (overrides: Partial<Claim> = {}): Claim => ({
  id: uuidv4(),
  policy_number: `POL-${Math.random().toString(36).substring(7)}`,
  claimant_name: 'Test Claimant',
  claim_type: 'medical',
  claim_amount: 1000,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createTestDocument = (overrides: Partial<Document> = {}): Document => ({
  id: uuidv4(),
  claim_id: uuidv4(),
  category_id: uuidv4(),
  file_name: 'test-document.pdf',
  file_path: '/test/path/test-document.pdf',
  file_size: 1024,
  mime_type: 'application/pdf',
  status: 'pending',
  metadata: {},
  uploaded_at: new Date().toISOString(),
  ...overrides
});

export const createTestUser = (overrides: Partial<any> = {}) => ({
  id: uuidv4(),
  email: `test-${Math.random().toString(36).substring(7)}@example.com`,
  role: 'user',
  created_at: new Date().toISOString(),
  ...overrides
});

export const createTestPolicy = (overrides: Partial<any> = {}) => ({
  id: uuidv4(),
  policy_number: `POL-${Math.random().toString(36).substring(7)}`,
  holder_id: uuidv4(),
  type: 'health',
  status: 'active',
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  coverage_amount: 100000,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});