import {
  createTrigger,
  Property,
  TriggerStrategy,
} from '@activepieces/pieces-framework';
import { HttpMethod } from '@activepieces/pieces-common';
import { textkitAuth } from '../auth';
import { textkitClient } from '../common/client';

const WEBHOOK_STORE_KEY = 'textkit_webhook';
const EVENT_TYPE = 'message.received';

export const newInboundMessageTrigger = createTrigger({
  auth: textkitAuth,
  name: 'new_inbound_message',
  displayName: 'New Inbound Message',
  description: 'Triggers when one of your TextKit numbers receives a text.',
  classification: 'READ',
  aiMetadata: {
    description:
      'Fires once for each SMS received on the account’s TextKit numbers, optionally limited to some numbers.',
  },
  type: TriggerStrategy.WEBHOOK,
  props: {
    numbers: Property.Array({
      displayName: 'Numbers',
      description:
        'Only trigger for texts received on these numbers of yours, e.g. +15005550100. Leave empty for every number.',
      required: false,
    }),
    ignoreSimulated: Property.Checkbox({
      displayName: 'Ignore Simulated Messages',
      description: 'Skip inbound messages simulated with a test key.',
      required: false,
      defaultValue: false,
    }),
  },
  sampleData: {
    event_id: 'evt_a1B2c3D4e5F6g7H8',
    type: EVENT_TYPE,
    mode: 'test',
    created_at: '2026-08-13T00:41:00.000Z',
    message_id: 'msg_x9Y8z7W6v5U4t3S2',
    from: '+14155550132',
    to: '+15005550100',
    body: 'Hey, got your message',
    conversation: '5005550100_4155550132',
    simulated: true,
  },
  async onEnable(context) {
    const numbers = (context.propsValue.numbers ?? [])
      .map((number) => String(number).trim())
      .filter((number) => number.length > 0);
    const webhook = await textkitClient.request<WebhookEndpoint>({
      apiKey: context.auth.secret_text,
      method: HttpMethod.POST,
      path: '/webhooks',
      body: textkitClient.compact({
        url: context.webhookUrl,
        events: [EVENT_TYPE],
        numbers: numbers.length > 0 ? numbers : undefined,
        description: 'Activepieces: New Inbound Message',
      }),
    });
    await context.store.put<WebhookEndpoint>(WEBHOOK_STORE_KEY, {
      id: webhook.id,
      secret: webhook.secret,
    });
  },
  async onDisable(context) {
    const webhook = await context.store.get<WebhookEndpoint>(WEBHOOK_STORE_KEY);
    if (webhook?.id) {
      await textkitClient
        .request({
          apiKey: context.auth.secret_text,
          method: HttpMethod.DELETE,
          path: `/webhooks/${encodeURIComponent(webhook.id)}`,
        })
        .catch(() => undefined);
    }
    await context.store.delete(WEBHOOK_STORE_KEY);
  },
  async run(context) {
    const webhook = await context.store.get<WebhookEndpoint>(WEBHOOK_STORE_KEY);
    const { headers, body, rawBody } = context.payload;
    const event = isInboundEvent(body) ? body : undefined;
    const valid = textkitClient.verifySignature({
      rawBody: rawBodyToString({ rawBody, body }),
      header: headers['textkit-signature'],
      secret: webhook?.secret,
    });
    if (!valid || !event || event.type !== EVENT_TYPE) {
      return [];
    }
    if (context.propsValue.ignoreSimulated && event.data.simulated === true) {
      return [];
    }
    return [
      {
        event_id: event.id,
        type: event.type,
        mode: event.mode,
        created_at: event.created_at,
        ...event.data,
      },
    ];
  },
  async test(context) {
    const page = await textkitClient.request<MessageList>({
      apiKey: context.auth.secret_text,
      method: HttpMethod.GET,
      path: '/messages',
      queryParams: { direction: 'inbound', limit: '5' },
    });
    return page.data.map((message) => ({
      event_id: null,
      type: EVENT_TYPE,
      mode: message.test ? 'test' : 'live',
      created_at: message.created_at,
      message_id: message.id,
      from: message.from,
      to: message.to,
      body: message.body,
      conversation: message.conversation,
      simulated: message.simulated,
    }));
  },
});

function isInboundEvent(value: unknown): value is InboundEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'type' in value &&
    'data' in value &&
    typeof value.data === 'object' &&
    value.data !== null
  );
}

function rawBodyToString({
  rawBody,
  body,
}: {
  rawBody: unknown;
  body: unknown;
}): string {
  if (typeof rawBody === 'string') {
    return rawBody;
  }
  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString('utf8');
  }
  return JSON.stringify(body);
}

type WebhookEndpoint = {
  id: string;
  secret: string;
};

type InboundEvent = {
  id: string;
  type: string;
  mode: string;
  created_at: string;
  data: Record<string, unknown> & { simulated?: boolean };
};

type MessageList = {
  data: {
    id: string;
    from: string;
    to: string;
    body: string;
    conversation?: string;
    simulated?: boolean;
    test?: boolean;
    created_at: string;
  }[];
};
