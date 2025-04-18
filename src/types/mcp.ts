export interface MCPAuth {
  token: string;
  timestamp: number;
  signature: string;
}

export interface MCPRequest {
  functionName: string;
  parameters: any;
  requestId: string;
  auth: MCPAuth;
}
