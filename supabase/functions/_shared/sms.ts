/**
 * SMS boundary for BHW Care (server-side only).
 *
 * - Message text comes only from fixed templates, never from free-form data.
 * - Providers sit behind one interface so the vendor can be swapped.
 * - The PhilSMS API token is passed in by server code (from secrets). It is kept in
 *   a closure, never logged, and never shipped to the mobile app.
 *
 * No imports and no Deno-specific APIs, so this can be unit tested with Jest.
 */

export type SmsLanguage = 'en' | 'tl';
export type SmsTemplateKey = 'prenatal_reminder' | 'high_risk_alert';
export type SmsType = 'plain' | 'unicode';

export type SmsParams = {
  date?: string;
  facility?: string;
};

export type RenderResult =
  { ok: true; message: string; type: SmsType } | { ok: false; reason: string };

const TEMPLATES: Record<SmsTemplateKey, Record<SmsLanguage, string>> = {
  prenatal_reminder: {
    en: 'BHW Care: Reminder. You have a prenatal check-up on {date} at {facility}. Open BHW Care for details.',
    tl: 'BHW Care: Paalala po. May prenatal check-up kayo sa {date} sa {facility}. Mag-check sa BHW Care para sa detalye.',
  },
  high_risk_alert: {
    en: 'BHW Care: New HIGH-RISK pregnancy alert needs follow-up. Open BHW Care for details.',
    tl: 'BHW Care: May bagong HIGH-RISK pregnancy alert na nangangailangan ng follow-up. Buksan ang BHW Care para sa detalye.',
  },
};

const REQUIRED_PARAMS: Record<SmsTemplateKey, readonly ('date' | 'facility')[]> = {
  prenatal_reminder: ['date', 'facility'],
  high_risk_alert: [],
};

// Letters, digits, spaces and basic punctuation only. No ':' or '/', so no URLs.
const PARAM_PATTERN = /^[A-Za-z0-9ÑñÁÉÍÓÚáéíóú .,'-]{1,60}$/;
const MAX_MESSAGE_LENGTH = 320;

export function renderSmsTemplate(
  key: SmsTemplateKey,
  language: SmsLanguage,
  params: SmsParams,
): RenderResult {
  let message = TEMPLATES[key][language];

  for (const name of REQUIRED_PARAMS[key]) {
    const value = params[name];
    if (value === undefined || !PARAM_PATTERN.test(value)) {
      return { ok: false, reason: `invalid_param:${name}` };
    }
    message = message.replace(`{${name}}`, value);
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: 'too_long' };
  }

  const type: SmsType = /^[\x20-\x7E]*$/.test(message) ? 'plain' : 'unicode';
  return { ok: true, message, type };
}

/**
 * Normalizes a Philippine mobile number to the 63XXXXXXXXXX format PhilSMS expects.
 * Returns null when the input is not a Philippine mobile number.
 */
export function normalizePhilippineMobile(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '');

  if (/^\+639\d{9}$/.test(digits)) {
    return `63${digits.slice(3)}`;
  }
  if (/^639\d{9}$/.test(digits)) {
    return digits;
  }
  if (/^09\d{9}$/.test(digits)) {
    return `63${digits.slice(1)}`;
  }
  return null;
}

export type SmsSendRequest = {
  recipient: string;
  message: string;
  type: SmsType;
};

export type SmsSendResult =
  | { status: 'accepted'; providerMessageId: string | null }
  | { status: 'failed'; errorCode: string; retryable: boolean }
  | { status: 'unknown'; errorCode: string };

export interface SmsProvider {
  readonly name: string;
  send(request: SmsSendRequest): Promise<SmsSendResult>;
}

/** Development provider: records messages and accepts them. Sends nothing. */
export function createMockSmsProvider(): SmsProvider & { sent: SmsSendRequest[] } {
  const sent: SmsSendRequest[] = [];

  return {
    name: 'mock',
    sent,
    async send(request) {
      sent.push(request);
      return { status: 'accepted', providerMessageId: `mock-${sent.length}` };
    },
  };
}

export type PhilSmsConfig = {
  apiToken: string;
  senderId: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const DEFAULT_BASE_URL = 'https://app.philsms.com';
const DEFAULT_TIMEOUT_MS = 10000;
const SENDER_ID_PATTERN = /^[A-Za-z0-9]{1,11}$/;

function extractMessageId(data: unknown): string | null {
  if (typeof data === 'object' && data !== null) {
    const uid = (data as Record<string, unknown>).uid;
    if (typeof uid === 'string' && uid !== '') {
      return uid;
    }
  }
  return null;
}

async function interpretResponse(response: Response): Promise<SmsSendResult> {
  const status = response.status;

  if (status === 429) {
    return { status: 'failed', errorCode: 'rate_limited', retryable: true };
  }
  if (status === 401 || status === 403) {
    return { status: 'failed', errorCode: 'auth_failed', retryable: false };
  }
  // A server error may mean the message was still processed, so it is not a clean failure.
  if (status >= 500) {
    return { status: 'unknown', errorCode: `http_${status}` };
  }
  if (status >= 400) {
    return { status: 'failed', errorCode: `http_${status}`, retryable: false };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (typeof body !== 'object' || body === null) {
    return { status: 'unknown', errorCode: 'unreadable_response' };
  }

  const record = body as Record<string, unknown>;
  if (record.status === 'success') {
    return { status: 'accepted', providerMessageId: extractMessageId(record.data) };
  }
  if (record.status === 'error') {
    return { status: 'failed', errorCode: 'provider_rejected', retryable: false };
  }
  return { status: 'unknown', errorCode: 'unexpected_response' };
}

/**
 * PhilSMS adapter. Only error codes are reported, never the provider's message text,
 * the SMS body, or the token.
 */
export function createPhilSmsProvider(config: PhilSmsConfig): SmsProvider {
  if (config.apiToken.trim() === '') {
    throw new Error('PhilSMS API token is required');
  }
  if (!SENDER_ID_PATTERN.test(config.senderId)) {
    throw new Error('PhilSMS sender id must be 1 to 11 letters or digits');
  }

  const apiToken = config.apiToken;
  const senderId = config.senderId;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    name: 'philsms',
    async send(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/api/v3/sms/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            recipient: request.recipient,
            sender_id: senderId,
            type: request.type,
            message: request.message,
          }),
          signal: controller.signal,
        });
        return await interpretResponse(response);
      } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return { status: 'unknown', errorCode: timedOut ? 'timeout' : 'network_error' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
