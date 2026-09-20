import {
  getExportVersion,
  publishNextVersion,
  validateExportConfig,
  type ExportTemplateVersion,
} from '../exportTemplate';

const VALID = {
  recordType: 'prenatal',
  enabled: true,
  sections: ['section_a', 'section_b'],
  labelMode: 'bilingual',
  qr: { enabled: true, position: 'footer_right' },
  confidentialityFooter: {
    en: 'Confidential health record.',
    tl: 'Kumpidensyal na talaan ng kalusugan.',
  },
  paperSize: 'a4',
  orientation: 'portrait',
  showGeneratedAt: true,
  showRecordReference: true,
};

const META = {
  createdBy: 'user-1',
  createdAt: '2026-09-21T00:00:00.000Z',
  changeSummary: 'Initial version',
};

function publishOrFail(history: readonly ExportTemplateVersion[], input: unknown, meta = META) {
  const result = publishNextVersion(history, input, meta);
  if (!result.ok) {
    throw new Error(`publish failed: ${result.errors.join('; ')}`);
  }
  return result;
}

describe('validateExportConfig', () => {
  it('accepts a valid configuration and drops unknown fields', () => {
    expect(validateExportConfig(VALID)).toEqual({ ok: true, config: VALID });

    const withExtra = validateExportConfig({ ...VALID, patientName: 'Juan Dela Cruz' });
    expect(withExtra.ok && 'patientName' in withExtra.config).toBe(false);
  });

  it('rejects input that is not an object', () => {
    for (const input of [null, undefined, 'text', 42, [], true]) {
      expect(validateExportConfig(input).ok).toBe(false);
    }
  });

  it('rejects unsupported choices', () => {
    const invalid = [
      { ...VALID, recordType: 'senior' },
      { ...VALID, labelMode: 'klingon' },
      { ...VALID, paperSize: 'tabloid' },
      { ...VALID, orientation: 'diagonal' },
      { ...VALID, qr: { enabled: true, position: 'center' } },
      { ...VALID, enabled: 'yes' },
      { ...VALID, qr: { position: 'footer_right' } },
    ];

    for (const input of invalid) {
      expect(validateExportConfig(input).ok).toBe(false);
    }
  });

  it('rejects empty, duplicate, badly named or too many sections', () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => `section_${index}`);
    const invalid = [
      { ...VALID, sections: [] },
      { ...VALID, sections: 'section_a' },
      { ...VALID, sections: ['Section A'] },
      { ...VALID, sections: ['section_a', 'section_a'] },
      { ...VALID, sections: tooMany },
    ];

    for (const input of invalid) {
      expect(validateExportConfig(input).ok).toBe(false);
    }
  });

  it('requires the confidentiality footer in both languages', () => {
    const invalid = [
      { ...VALID, confidentialityFooter: undefined },
      { ...VALID, confidentialityFooter: { en: 'Confidential.' } },
      { ...VALID, confidentialityFooter: { en: 'Confidential.', tl: '   ' } },
    ];

    for (const input of invalid) {
      expect(validateExportConfig(input).ok).toBe(false);
    }
  });

  it('rejects footers with control characters or that are too long', () => {
    const withBreak = {
      ...VALID,
      confidentialityFooter: { en: 'Line one\nLine two', tl: 'Kumpidensyal.' },
    };
    const tooLong = {
      ...VALID,
      confidentialityFooter: { en: 'x'.repeat(301), tl: 'Kumpidensyal.' },
    };

    expect(validateExportConfig(withBreak).ok).toBe(false);
    expect(validateExportConfig(tooLong).ok).toBe(false);
  });
});

describe('publishNextVersion', () => {
  it('publishes version 1 for an empty history', () => {
    const result = publishOrFail([], VALID);

    expect(result.published.version).toBe(1);
    expect(result.published.changeSummary).toBe('Initial version');
    expect(result.versions).toHaveLength(1);
  });

  it('appends a new version and leaves earlier versions untouched', () => {
    const first = publishOrFail([], VALID);
    const snapshot = JSON.stringify(first.versions);

    const second = publishOrFail(
      first.versions,
      { ...VALID, qr: { enabled: false, position: 'footer_right' } },
      { ...META, changeSummary: 'Turn the QR code off' },
    );

    expect(second.published.version).toBe(2);
    expect(second.versions).toHaveLength(2);
    expect(JSON.stringify(first.versions)).toBe(snapshot);
    expect(getExportVersion(second.versions, 1)?.config.qr.enabled).toBe(true);
    expect(getExportVersion(second.versions, 2)?.config.qr.enabled).toBe(false);
    expect(getExportVersion(second.versions, 3)).toBeNull();
  });

  it('requires a change summary, an author and a valid date', () => {
    const cases = [
      { ...META, changeSummary: '   ' },
      { ...META, changeSummary: 'x'.repeat(301) },
      { ...META, createdBy: '' },
      { ...META, createdAt: 'not a date' },
    ];

    for (const meta of cases) {
      expect(publishNextVersion([], VALID, meta).ok).toBe(false);
    }
  });

  it('rejects a publish that changes nothing', () => {
    const first = publishOrFail([], VALID);

    const again = publishNextVersion(first.versions, { ...VALID }, META);

    expect(again).toEqual({ ok: false, errors: ['there are no changes from the latest version'] });
  });

  it('does not add a version when the configuration is invalid', () => {
    const first = publishOrFail([], VALID);

    const result = publishNextVersion(first.versions, { ...VALID, paperSize: 'tabloid' }, META);

    expect(result.ok).toBe(false);
    expect(first.versions).toHaveLength(1);
  });
});
