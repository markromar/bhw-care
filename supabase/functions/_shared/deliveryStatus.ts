/**
 * Delivery status rules for notification channels (in-app, push, SMS).
 *
 * Shared server-side code. It has no imports and no Deno-specific APIs, so it can
 * be unit tested with Jest and imported by Edge Functions later.
 *
 * Rules:
 * - 'delivered' may only be set when the provider gave evidence of delivery.
 * - A failed delivery can be retried, but only below an attempt limit.
 * - An 'unknown' outcome is never retried directly, because the message may already
 *   have been sent. It must first be resolved to accepted, delivered or failed.
 */

export const DELIVERY_STATUSES = [
  'scheduled',
  'queued',
  'sending',
  'accepted',
  'delivered',
  'failed',
  'unknown',
  'cancelled',
  'superseded',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<DeliveryStatus, readonly DeliveryStatus[]> = {
  scheduled: ['queued', 'cancelled', 'superseded'],
  queued: ['sending', 'cancelled', 'superseded'],
  sending: ['accepted', 'failed', 'unknown'],
  accepted: ['delivered', 'failed', 'unknown'],
  unknown: ['accepted', 'delivered', 'failed'],
  failed: ['queued'],
  delivered: [],
  cancelled: [],
  superseded: [],
};

export const DEFAULT_MAX_ATTEMPTS = 3;

export type TransitionOptions = {
  deliveryEvidence?: boolean;
  attemptCount?: number;
  maxAttempts?: number;
};

export type TransitionCheck =
  | { ok: true }
  | { ok: false; reason: 'not_allowed' | 'delivery_evidence_required' | 'retry_limit_reached' };

export function checkTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
  options: TransitionOptions = {},
): TransitionCheck {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: 'not_allowed' };
  }

  if (to === 'delivered' && options.deliveryEvidence !== true) {
    return { ok: false, reason: 'delivery_evidence_required' };
  }

  if (from === 'failed' && to === 'queued') {
    const attempts = options.attemptCount ?? 0;
    const limit = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    if (attempts >= limit) {
      return { ok: false, reason: 'retry_limit_reached' };
    }
  }

  return { ok: true };
}
