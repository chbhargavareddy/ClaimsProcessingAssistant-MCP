export interface MCPAuth {
  token: string;
  timestamp: number;
  signature: string;
}

export interface MCPRequest {
  functionName: string;
  parameters: Record<string, unknown>;
  requestId: string;
  auth: MCPAuth;
}
