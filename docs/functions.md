# Claims Processing Functions

This document describes the available MCP functions for claims processing.

## Submit Claim

Submit a new insurance claim to the system.

```typescript
function submitClaim(params: {
  policy_number: string;
  claimant_name: string;
  claim_type: string;
  claim_amount: number;
  description?: string;
  supporting_documents?: string[];
}): Promise<{
  claim: ClaimResponse;
  status: string;
  message: string;
}>
```

### Parameters
- `policy_number`: Valid policy number
- `claimant_name`: Name of the person making the claim
- `claim_type`: Type of claim being submitted
- `claim_amount`: Amount being claimed
- `description` (optional): Additional details about the claim
- `supporting_documents` (optional): Array of document IDs

### Returns
- `claim`: The created claim object
- `status`: 'success' or 'error'
- `message`: Description of the result

## Validate Claim

Validate an existing claim against business rules.

```typescript
function validateClaim(params: {
  claimId: string;
}): Promise<{
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
  status: string;
}>
```

### Parameters
- `claimId`: UUID of the claim to validate

### Returns
- `isValid`: Whether the claim passed validation
- `errors`: Array of validation errors (if any)
- `warnings`: Array of validation warnings (if any)
- `status`: Current claim status

## Get Claim Status

Get detailed status information about a claim.

```typescript
function getClaimStatus(params: {
  claimId: string;
}): Promise<{
  claim: ClaimResponse;
  validationHistory?: Array<{
    timestamp: string;
    isValid: boolean;
    errors?: Array<{
      field: string;
      message: string;
    }>;
    warnings?: Array<{
      field: string;
      message: string;
    }>;
  }>;
  documents?: Array<{
    id: string;
    type: string;
    status: string;
    uploaded_at: string;
  }>;
}>
```

### Parameters
- `claimId`: UUID of the claim to check

### Returns
- `claim`: Current claim information
- `validationHistory`: History of validation attempts
- `documents`: List of associated documents

## List Claims

List and filter claims with pagination.

```typescript
function listClaims(params: {
  status?: 'pending' | 'approved' | 'rejected';
  claim_type?: string;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
  policy_number?: string;
  claimant_name?: string;
  page?: number;
  limit?: number;
}): Promise<{
  claims: ClaimResponse[];
  total: number;
  page: number;
  pageSize: number;
}>
```

### Parameters
All parameters are optional:
- `status`: Filter by claim status
- `claim_type`: Filter by type of claim
- `from_date`: Filter claims after this date
- `to_date`: Filter claims before this date
- `min_amount`: Filter claims with amount >= this value
- `max_amount`: Filter claims with amount <= this value
- `policy_number`: Filter by policy number
- `claimant_name`: Filter by claimant name (partial match)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Returns
- `claims`: Array of claims matching the filters
- `total`: Total number of matching claims
- `page`: Current page number
- `pageSize`: Number of items per page