import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece, PieceCategory } from '@activepieces/pieces-framework';
import { textkitAuth } from './lib/auth';
import { textkitClient } from './lib/common/client';
import { sendSmsAction } from './lib/actions/send-sms';
import { startVerificationAction } from './lib/actions/start-verification';
import { checkVerificationAction } from './lib/actions/check-verification';
import { newInboundMessageTrigger } from './lib/triggers/new-inbound-message';

export const textkit = createPiece({
  displayName: 'TextKit',
  description: 'SMS API to send texts, receive replies and verify phone numbers.',
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://cdn.activepieces.com/pieces/textkit.png',
  categories: [PieceCategory.COMMUNICATION],
  auth: textkitAuth,
  authors: ['sbier060'],
  actions: [
    sendSmsAction,
    startVerificationAction,
    checkVerificationAction,
    createCustomApiCallAction({
      baseUrl: () => textkitClient.baseUrl,
      auth: textkitAuth,
      authMapping: async (auth) => ({
        Authorization: `Bearer ${auth.secret_text}`,
      }),
    }),
  ],
  triggers: [newInboundMessageTrigger],
});
