import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import { textkitAuth } from '../auth';
import { textkitClient } from '../common/client';

export const startVerificationAction = createAction({
  auth: textkitAuth,
  name: 'start_verification',
  displayName: 'Start Verification',
  description: 'Texts a one-time code to a phone number.',
  audience: 'both',
  classification: 'WRITE',
  aiMetadata: {
    description:
      'Text a one-time verification code to a phone number. Follow with Check Verification using the code the user enters. Codes expire after 10 minutes; each call sends a new code.',
    idempotent: false,
  },
  props: {
    phone: Property.ShortText({
      displayName: 'Phone',
      description:
        'Phone number to verify in international format, e.g. +14155550132. With a test key nothing is sent and the code is always 111111.',
      required: true,
    }),
    appName: Property.ShortText({
      displayName: 'App Name',
      description: 'Your product name, shown in the message (up to 24 characters).',
      required: false,
    }),
    from: Property.ShortText({
      displayName: 'From',
      description:
        'Send from one of your TextKit numbers instead of the TextKit pool, e.g. +15005550100.',
      required: false,
    }),
    userIp: Property.ShortText({
      displayName: 'User IP',
      description: "Your end user's IP address, used for per-IP rate limits.",
      required: false,
    }),
  },
  async run(context) {
    const { phone, appName, from, userIp } = context.propsValue;
    return textkitClient.request<Record<string, unknown>>({
      apiKey: context.auth.secret_text,
      method: HttpMethod.POST,
      path: '/verify',
      body: textkitClient.compact({
        channel: 'sms',
        phone,
        app_name: appName,
        from,
        user_ip: userIp,
      }),
    });
  },
});
