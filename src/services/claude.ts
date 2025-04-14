import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../config';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.CLAUDE_API_KEY,
    });
  }

  async analyzeClaim(claimData: any) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Please analyze this insurance claim:
${JSON.stringify(claimData, null, 2)}

Please provide:
1. Validity assessment
2. Risk factors
3. Recommended actions
4. Any potential fraud indicators`,
          },
        ],
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Error analyzing claim with Claude:', error);
      throw new Error('Failed to analyze claim with AI');
    }
  }

  async validateDocuments(documents: any[]) {
    try {
      const message = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Please validate these claim documents:
${JSON.stringify(documents, null, 2)}

Please check for:
1. Document completeness
2. Information consistency
3. Required signatures
4. Date validity
5. Any suspicious patterns`,
          },
        ],
      });

      return message.content[0].text;
    } catch (error) {
      console.error('Error validating documents with Claude:', error);
      throw new Error('Failed to validate documents with AI');
    }
  }
}
