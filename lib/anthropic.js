import Anthropic from '@anthropic-ai/sdk';

// Singleton Anthropic client shared across all tools and the agent loop.
// maxRetries: 2 enables SDK-native exponential back-off on 429 / 500 / 529.
// timeout: 60s matches the previous per-file defaults.
let _client = null;

export function getClient() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({
      apiKey:     process.env.ANTHROPIC_API_KEY,
      timeout:    60_000,
      maxRetries: 2,
    });
  }
  return _client;
}
