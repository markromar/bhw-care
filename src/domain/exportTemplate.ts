/**
 * Export template configuration (PDF exports).
 *
 * This is configuration only: it never contains patient data. Configuration arrives
 * as untrusted JSON, so it is validated into a fixed shape before use. Published
 * versions are immutable: a change creates a new version, so earlier exports stay
 * attributable to the template version that produced them.
 */

export const EXPORT_RECORD_TYPES = ['prenatal', 'newborn', 'vaccination'] as const;
export type ExportRecordType = (typeof EXPORT_RECORD_TYPES)[number];

export const LABEL_MODES = ['user_language', 'english', 'tagalog', 'bilingual'] as const;
export type LabelMode = (typeof LABEL_MODES)[number];

export const QR_POSITIONS = ['header_right', 'footer_left', 'footer_right'] as const;
export type QrPosition = (typeof QR_POSITIONS)[number];

export const PAPER_SIZES = ['a4', 'letter', 'legal'] as const;
export type PaperSize = (typeof PAPER_SIZES)[number];

export const ORIENTATIONS = ['portrait', 'landscape'] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export type ExportTemplateConfig = {
  recordType: ExportRecordType;
  enabled: boolean;
  sections: string[];
  labelMode: LabelMode;
  qr: { enabled: boolean; position: QrPosition };
  confidentialityFooter: { en: string; tl: string };
  paperSize: PaperSize;
  orientation: Orientation;
  showGeneratedAt: boolean;
  showRecordReference: boolean;
};

export type ValidationResult =
  { ok: true; config: ExportTemplateConfig } | { ok: false; errors: string[] };

const SECTION_CODE_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const MAX_SECTIONS = 50;
const MAX_FOOTER_LENGTH = 300;
// Control characters, including line breaks, are not allowed in footer text.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Returns the value when it is one of the allowed choices. Otherwise records an
// error and returns a placeholder; callers must check `errors` before using it.
function choose<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
  errors: string[],
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  errors.push(`${name} is not a supported value`);
  return allowed[0];
}

function readBoolean(value: unknown, name: string, errors: string[]): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  errors.push(`${name} must be true or false`);
  return false;
}

function readFooter(value: unknown, name: string, errors: string[]): string {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${name} is required`);
    return '';
  }
  if (value.length > MAX_FOOTER_LENGTH) {
    errors.push(`${name} is too long`);
    return '';
  }
  if (CONTROL_CHARACTERS.test(value)) {
    errors.push(`${name} must not contain control characters`);
    return '';
  }
  return value.trim();
}

export function validateExportConfig(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, errors: ['config must be an object'] };
  }

  const errors: string[] = [];

  const recordType = choose(input.recordType, EXPORT_RECORD_TYPES, 'recordType', errors);
  const labelMode = choose(input.labelMode, LABEL_MODES, 'labelMode', errors);
  const paperSize = choose(input.paperSize, PAPER_SIZES, 'paperSize', errors);
  const orientation = choose(input.orientation, ORIENTATIONS, 'orientation', errors);
  const enabled = readBoolean(input.enabled, 'enabled', errors);
  const showGeneratedAt = readBoolean(input.showGeneratedAt, 'showGeneratedAt', errors);
  const showRecordReference = readBoolean(input.showRecordReference, 'showRecordReference', errors);

  let sections: string[] = [];
  const rawSections = input.sections;
  if (!Array.isArray(rawSections) || rawSections.length < 1 || rawSections.length > MAX_SECTIONS) {
    errors.push('sections must contain 1 to 50 section codes');
  } else if (
    !rawSections.every((code) => typeof code === 'string' && SECTION_CODE_PATTERN.test(code))
  ) {
    errors.push('every section code must be lowercase letters, digits or underscores');
  } else if (new Set(rawSections).size !== rawSections.length) {
    errors.push('section codes must be unique');
  } else {
    sections = rawSections as string[];
  }

  const qrInput = isRecord(input.qr) ? input.qr : null;
  if (qrInput === null) {
    errors.push('qr must be an object');
  }
  const qrEnabled = readBoolean(qrInput?.enabled, 'qr.enabled', errors);
  const qrPosition = choose(qrInput?.position, QR_POSITIONS, 'qr.position', errors);

  const footerInput = isRecord(input.confidentialityFooter) ? input.confidentialityFooter : null;
  if (footerInput === null) {
    errors.push('confidentialityFooter must be an object');
  }
  const footerEn = readFooter(footerInput?.en, 'confidentialityFooter.en', errors);
  const footerTl = readFooter(footerInput?.tl, 'confidentialityFooter.tl', errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Built in a fixed key order, and only from known fields, so unknown input is dropped.
  return {
    ok: true,
    config: {
      recordType,
      enabled,
      sections,
      labelMode,
      qr: { enabled: qrEnabled, position: qrPosition },
      confidentialityFooter: { en: footerEn, tl: footerTl },
      paperSize,
      orientation,
      showGeneratedAt,
      showRecordReference,
    },
  };
}

export type ExportTemplateVersion = {
  version: number;
  config: ExportTemplateConfig;
  createdAt: string;
  createdBy: string;
  changeSummary: string;
};

export type PublishMeta = {
  createdBy: string;
  createdAt: string;
  changeSummary: string;
};

export type PublishResult =
  | { ok: true; versions: ExportTemplateVersion[]; published: ExportTemplateVersion }
  | { ok: false; errors: string[] };

const MAX_SUMMARY_LENGTH = 300;

/**
 * Publishes a new immutable version. The existing history is never changed; the
 * result is a new list with the new version appended.
 */
export function publishNextVersion(
  history: readonly ExportTemplateVersion[],
  input: unknown,
  meta: PublishMeta,
): PublishResult {
  const errors: string[] = [];

  const summary = meta.changeSummary.trim();
  if (summary === '') {
    errors.push('a change summary is required');
  } else if (summary.length > MAX_SUMMARY_LENGTH) {
    errors.push('the change summary is too long');
  }
  if (meta.createdBy.trim() === '') {
    errors.push('createdBy is required');
  }
  if (Number.isNaN(Date.parse(meta.createdAt))) {
    errors.push('createdAt must be a valid date');
  }

  const validated = validateExportConfig(input);
  if (!validated.ok) {
    errors.push(...validated.errors);
  }

  if (errors.length > 0 || !validated.ok) {
    return { ok: false, errors };
  }

  const latest = history.reduce<ExportTemplateVersion | null>(
    (best, item) => (best === null || item.version > best.version ? item : best),
    null,
  );

  if (latest !== null && JSON.stringify(latest.config) === JSON.stringify(validated.config)) {
    return { ok: false, errors: ['there are no changes from the latest version'] };
  }

  const published: ExportTemplateVersion = {
    version: (latest?.version ?? 0) + 1,
    config: validated.config,
    createdAt: meta.createdAt,
    createdBy: meta.createdBy.trim(),
    changeSummary: summary,
  };

  return { ok: true, versions: [...history, published], published };
}

/** Finds the exact version an earlier export was made with, or null. */
export function getExportVersion(
  history: readonly ExportTemplateVersion[],
  version: number,
): ExportTemplateVersion | null {
  return history.find((item) => item.version === version) ?? null;
}
