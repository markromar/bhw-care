import {
  createMockSmsProvider,
  createPhilSmsProvider,
  normalizePhilippineMobile,
  renderSmsTemplate,
} from '../sms';

function jsonResponse(status: number, body: unknown): Response {
  return { status, json: async () => body } as unknown as Response;
}

const REQUEST = { recipient: '639171234567', message: 'Test message', type: 'plain' as const };

function createProvider(fetchImpl: jest.Mock) {
  return createPhilSmsProvider({ apiToken: 'test-token', senderId: 'BHWCare', fetchImpl });
}

describe('normalizePhilippineMobile', () => {
  it('accepts the common Philippine mobile formats', () => {
    const inputs = [
      '09171234567',
      '+639171234567',
      '639171234567',
      '0917 123 4567',
      '+63 917-123-4567',
    ];

    for (const input of inputs) {
      expect(normalizePhilippineMobile(input)).toBe('639171234567');
    }
  });

  it('rejects numbers that are not Philippine mobile numbers', () => {
    const inputs = ['0812345678', '12345', '+6391234', '+14155550123', '', '09171234567890'];

    for (const input of inputs) {
      expect(normalizePhilippineMobile(input)).toBeNull();
    }
  });
});

describe('renderSmsTemplate', () => {
  it('renders the Tagalog prenatal reminder', () => {
    const result = renderSmsTemplate('prenatal_reminder', 'tl', {
      date: '30 Sep',
      facility: 'Demo Health Center',
    });

    expect(result).toEqual({
      ok: true,
      message:
        'BHW Care: Paalala po. May prenatal check-up kayo sa 30 Sep sa Demo Health Center. ' +
        'Mag-check sa BHW Care para sa detalye.',
      type: 'plain',
    });
  });

  it('renders the English high-risk alert without any patient or facility details', () => {
    const result = renderSmsTemplate('high_risk_alert', 'en', { facility: 'Should Not Appear' });

    expect(result).toEqual({
      ok: true,
      message:
        'BHW Care: New HIGH-RISK pregnancy alert needs follow-up. Open BHW Care for details.',
      type: 'plain',
    });
  });

  it('rejects missing or unsafe parameters', () => {
    const invalidFacility = { ok: false, reason: 'invalid_param:facility' };

    expect(renderSmsTemplate('prenatal_reminder', 'en', { date: '30 Sep' })).toEqual(
      invalidFacility,
    );
    expect(
      renderSmsTemplate('prenatal_reminder', 'en', {
        date: '30 Sep',
        facility: 'see http://example.com',
      }),
    ).toEqual(invalidFacility);
    expect(
      renderSmsTemplate('prenatal_reminder', 'en', { date: '30 Sep', facility: 'A'.repeat(61) }),
    ).toEqual(invalidFacility);
    expect(
      renderSmsTemplate('prenatal_reminder', 'en', {
        date: '30 Sep\nBP 140/90',
        facility: 'Demo Health Center',
      }),
    ).toEqual({ ok: false, reason: 'invalid_param:date' });
  });

  it('uses unicode only when the message needs it', () => {
    const result = renderSmsTemplate('prenatal_reminder', 'tl', {
      date: '30 Sep',
      facility: 'Barangay Peña',
    });

    expect(result.ok && result.type).toBe('unicode');
  });
});

describe('createMockSmsProvider', () => {
  it('records messages and accepts them without sending anything', async () => {
    const provider = createMockSmsProvider();

    const result = await provider.send(REQUEST);

    expect(result).toEqual({ status: 'accepted', providerMessageId: 'mock-1' });
    expect(provider.sent).toEqual([REQUEST]);
  });
});

describe('createPhilSmsProvider', () => {
  it('sends the documented request and returns the provider message id', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 'success', data: { uid: 'abc123' } }));

    const result = await createProvider(fetchImpl).send(REQUEST);

    expect(result).toEqual({ status: 'accepted', providerMessageId: 'abc123' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://app.philsms.com/api/v3/sms/send');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body)).toEqual({
      recipient: '639171234567',
      sender_id: 'BHWCare',
      type: 'plain',
      message: 'Test message',
    });
  });

  it('accepts a success reply even when no message id can be found', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 'success', data: 'ok' }));

    expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
      status: 'accepted',
      providerMessageId: null,
    });
  });

  it('treats a provider error body as a rejection', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 'error', message: 'anything' }));

    expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
      status: 'failed',
      errorCode: 'provider_rejected',
      retryable: false,
    });
  });

  it('treats authentication problems as non-retryable failures', async () => {
    for (const status of [401, 403]) {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(status, {}));

      expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
        status: 'failed',
        errorCode: 'auth_failed',
        retryable: false,
      });
    }
  });

  it('treats rate limiting as a retryable failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(429, {}));

    expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
      status: 'failed',
      errorCode: 'rate_limited',
      retryable: true,
    });
  });

  it('treats server errors and network failures as unknown, not failed', async () => {
    for (const status of [500, 502, 503]) {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(status, {}));

      expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
        status: 'unknown',
        errorCode: `http_${status}`,
      });
    }

    const networkDown = jest.fn().mockRejectedValue(new Error('boom'));
    expect(await createProvider(networkDown).send(REQUEST)).toEqual({
      status: 'unknown',
      errorCode: 'network_error',
    });

    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const timedOut = jest.fn().mockRejectedValue(abortError);
    expect(await createProvider(timedOut).send(REQUEST)).toEqual({
      status: 'unknown',
      errorCode: 'timeout',
    });
  });

  it('treats an unreadable success response as unknown', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => {
        throw new Error('not json');
      },
    });

    expect(await createProvider(fetchImpl).send(REQUEST)).toEqual({
      status: 'unknown',
      errorCode: 'unreadable_response',
    });
  });

  it('refuses to be created without a token or with an invalid sender id', () => {
    expect(() => createPhilSmsProvider({ apiToken: '  ', senderId: 'BHWCare' })).toThrow(/token/);
    expect(() =>
      createPhilSmsProvider({ apiToken: 'test-token', senderId: 'Too Long Sender Name' }),
    ).toThrow(/sender/);
  });
});
