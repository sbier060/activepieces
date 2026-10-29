import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import { textkitAuth } from '../auth';
import { textkitClient } from '../common/client';

export const checkVerificationAction = createAction({
  auth: textkitAuth,
  name: 'check_verification',
  displayName: 'Check Verification',
  description: 'Checks the code a user entered.',
  audience: 'both',
  classification: 'WRITE',
  aiMetadata: {
    description:
      'Check a code the user entered against the one sent by Start Verification for the same phone number. Returns verified true on a match; a wrong code returns verified false and uses up one of the 5 attempts, so do not retry blindly.',
    idempotent: false,
  },
  props: {
    phone: Property.ShortText({
      displayName: 'Phone',
      description:
        'The phone number the code was sent to, in international format, e.g. +14155550132.',
      required: true,
    }),
    code: Property.ShortText({
      displayName: 'Code',
      description: 'The code the user entered.',
      required: true,
    }),
  },
  async run(context) {
    const { phone, code } = context.propsValue;
    return textkitClient.request<Record<string, unknown>>({
      apiKey: context.auth.secret_text,
      method: HttpMethod.POST,
      path: '/verify/check',
      body: { phone, code },
    });
  },
});
