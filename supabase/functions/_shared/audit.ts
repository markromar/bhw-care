/**
 * Audit event validation (server-side shared code).
 *
 * Validates an event before it is inserted into audit_events. The database enforces
 * the same shape and sets the sequence number, time and hash chain itself.
 * No imports and no Deno-specific APIs, so it can be unit tested with Jest.
 *
 * Details may hold field names, identifiers and flags only. Never health record contents.
 */

export const AUDIT_ACTOR_ROLES = [
  'super_admin',
  'kapitan',
  'admin',
  'bhw_head',
  'bhw',
  'rhu_nurse',
  'pregnant_mother',
  'guardian',
  'system',
] as const;

export const MAX_AUDIT_DETAILS_LENGTH = 4000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTION_PATTERN = /^[a-z0-9_.]{1,100}$/;
const ENTITY_TYPE_PATTERN = /^[a-z0-9_]{1,50}$/;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,100}$/;
const REASON_PATTERN = /^[a-z0-9_.]{1,50}$/;
const DETAILS_KEY_PATTERN = /^[a-z0-9_]{1,50}$/;
const MAX_DETAIL_STRING = 200;
const MAX_DETAIL_ARRAY = 50;

export type AuditRow = {
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  barangay_id: string | null;
  sync_operation_id: string | null;
  reason_code: string | null;
  details: Record<string, unknown>;
};

export type AuditValidation = { ok: true; row: AuditRow } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSimpleValue(value: unknown): boolean {
  if (value === null || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'string' && value.length <= MAX_DETAIL_STRING;
}

function isAllowedDetailValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length <= MAX_DETAIL_ARRAY && value.every(isSimpleValue);
  }
  return isSimpleValue(value);
}

function readOptional(
  value: unknown,
  pattern: RegExp,
  name: string,
  errors: string[],
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string' && pattern.test(value)) {
    return value;
  }
  errors.push(`${name} is not valid`);
  return null;
}

function readDetails(value: unknown, errors: string[]): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    errors.push('details must be an object');
    return {};
  }

  for (const [key, item] of Object.entries(value)) {
    if (!DETAILS_KEY_PATTERN.test(key)) {
      errors.push('details has an invalid key');
    }
    if (!isAllowedDetailValue(item)) {
      errors.push('details has an unsupported value');
    }
  }

  if (JSON.stringify(value).length > MAX_AUDIT_DETAILS_LENGTH) {
    errors.push('details is too large');
  }
  return value;
}

export function validateAuditEvent(input: unknown): AuditValidation {
  if (!isRecord(input)) {
    return { ok: false, errors: ['event must be an object'] };
  }

  const errors: string[] = [];

  const actorRole = typeof input.actorRole === 'string' ? input.actorRole : '';
  if (!(AUDIT_ACTOR_ROLES as readonly string[]).includes(actorRole)) {
    errors.push('actorRole is not valid');
  }

  const actorId = readOptional(input.actorId, UUID_PATTERN, 'actorId', errors);
  if (actorRole !== 'system' && actorId === null) {
    errors.push('actorId is required unless the actor is the system');
  }

  const action = typeof input.action === 'string' && ACTION_PATTERN.test(input.action);
  if (!action) {
    errors.push('action is not valid');
  }
  const entityType =
    typeof input.entityType === 'string' && ENTITY_TYPE_PATTERN.test(input.entityType);
  if (!entityType) {
    errors.push('entityType is not valid');
  }

  const entityId = readOptional(input.entityId, ENTITY_ID_PATTERN, 'entityId', errors);
  const barangayId = readOptional(input.barangayId, UUID_PATTERN, 'barangayId', errors);
  const syncOperationId = readOptional(
    input.syncOperationId,
    UUID_PATTERN,
    'syncOperationId',
    errors,
  );
  const reasonCode = readOptional(input.reasonCode, REASON_PATTERN, 'reasonCode', errors);
  const details = readDetails(input.details, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    row: {
      actor_id: actorId,
      actor_role: actorRole,
      action: input.action as string,
      entity_type: input.entityType as string,
      entity_id: entityId,
      barangay_id: barangayId,
      sync_operation_id: syncOperationId,
      reason_code: reasonCode,
      details,
    },
  };
}
