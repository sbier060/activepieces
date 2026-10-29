import { PieceAuth } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import { textkitClient } from './common/client';

export const textkitAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  description: `1. Sign in to the [TextKit console](https://jointextkit.com/console).
2. Open **API Keys** and create a key.
3. Paste it here. It starts with \`ssms_sk_\`.

A test key (\`ssms_sk_test_...\`) runs in the sandbox: nothing reaches a real phone and nothing is billed.`,
  required: true,
  validate: async ({ auth }) => {
    try {
      await textkitClient.request({
        apiKey: auth,
        method: HttpMethod.GET,
        path: '/messages',
        queryParams: { limit: '1' },
      });
      return { valid: true };
    } catch {
      return { valid: false, error: 'TextKit did not accept this API key.' };
    }
  },
});
