import { createAction, Property } from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import { textkitAuth } from '../auth';
import { textkitClient } from '../common/client';

export const sendSmsAction = createAction({
  auth: textkitAuth,
  name: 'send_sms',
  displayName: 'Send SMS',
  description: 'Sends a text message to one phone number.',
  audience: 'both',
  classification: 'WRITE',
  aiMetadata: {
    description:
      'Send one SMS to a single phone number from a TextKit number. A message sent during the recipient’s quiet hours comes back as a scheduled_message that goes out later. Each call sends a new text, so retries send duplicates.',
    idempotent: false,
  },
  props: {
    to: Property.ShortText({
      displayName: 'To',
      description:
        'Recipient phone number in international format, e.g. +14155550132. With a test key, +15005550006 always ends delivered.',
      required: true,
    }),
    body: Property.LongText({
      displayName: 'Message',
      description: 'Text to send, up to 1,600 characters.',
      required: true,
    }),
    from: Property.ShortText({
      displayName: 'From',
      description:
        'One of your TextKit numbers (e.g. +15005550100) or a sender pool ID (pool_...). Leave empty when your account has one number.',
      required: false,
    }),
    category: Property.StaticDropdown({
      displayName: 'Category',
      description:
        'What kind of message this is. Marketing messages follow stricter quiet-hours and consent rules.',
      required: false,
      defaultValue: 'transactional',
      options: {
        disabled: false,
        options: [
          { label: 'Transactional', value: 'transactional' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'One-time code', value: 'otp' },
        ],
      },
    }),
    scheduledAt: Property.DateTime({
      displayName: 'Send At',
      description: 'Send later instead of now, up to 30 days out.',
      required: false,
    }),
    tags: Property.Array({
      displayName: 'Tags',
      description: 'Up to 10 labels for filtering and reporting.',
      required: false,
    }),
  },
  async run(context) {
    const { to, body, from, category, scheduledAt, tags } =
      context.propsValue;
    return textkitClient.request<Record<string, unknown>>({
      apiKey: context.auth.secret_text,
      method: HttpMethod.POST,
      path: '/messages',
      body: textkitClient.compact({
        to,
        body,
        from,
        category,
        scheduled_at: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
        tags: tags && tags.length > 0 ? tags.map(String) : undefined,
      }),
    });
  },
});
