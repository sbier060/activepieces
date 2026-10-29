import { HttpMethod, httpClient } from '@activepieces/pieces-common';
import { createHmac, timingSafeEqual } from 'crypto';

const BASE_URL = 'https://api.jointextkit.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;

async function request<T>({
  apiKey,
  method,
  path,
  body,
  queryParams,
}: RequestParams): Promise<T> {
  const response = await httpClient.sendRequest<T>({
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'activepieces-textkit',
    },
    body,
    queryParams,
  });
  return response.body;
}

function verifySignature({
  rawBody,
  header,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
}: VerifySignatureParams): boolean {
  if (!header || !secret) {
    return false;
  }
  const parts = header.split(',').map((part) => {
    const index = part.indexOf('=');
    return {
      key: part.slice(0, index).trim(),
      value: part.slice(index + 1).trim(),
    };
  });
  const timestamp = parts.find((part) => part.key === 't')?.value;
  const signatures = parts
    .filter((part) => part.key === 'v1')
    .map((part) => part.value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
    return false;
  }
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }
  const expected = Buffer.from(
    createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')
  );
  return signatures.some((signature) => {
    const received = Buffer.from(signature);
    return (
      received.length === expected.length &&
      timingSafeEqual(received, expected)
    );
  });
}

function compact(
  values: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

export const textkitClient = {
  baseUrl: BASE_URL,
  request,
  verifySignature,
  compact,
};

type RequestParams = {
  apiKey: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  queryParams?: Record<string, string>;
};

type VerifySignatureParams = {
  rawBody: string;
  header: string | undefined;
  secret: string | undefined;
  nowSeconds?: number;
};
