/**
 * Opaque record references for QR codes and deep links.
 *
 * A QR code carries only an opaque reference with no meaning to anyone who scans it.
 * It must never contain a name, date of birth, address, phone number, clinical value,
 * token or signed URL. Scanning a QR never grants access: after sign-in, the server
 * resolves the reference and decides using the normal authorization rules.
 *
 * References are generated server-side. This file only validates and parses them.
 */

const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{22,64}$/;
const HTTPS_LINK_PATTERN = /^https:\/\/([a-z0-9.-]+)\/r\/([A-Za-z0-9_-]{22,64})$/i;
// The app's custom scheme is 'bhwcare' (see app.json).
const APP_LINK_PATTERN = /^bhwcare:\/\/r\/([A-Za-z0-9_-]{22,64})$/;

export function isValidRecordReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value);
}

/** Builds the link to print in a QR code. Returns null for an invalid reference or base. */
export function buildRecordLink(baseUrl: string, reference: string): string | null {
  const base = baseUrl.replace(/\/+$/, '');

  if (!isValidRecordReference(reference) || !/^https:\/\/[a-z0-9.-]+$/i.test(base)) {
    return null;
  }
  return `${base}/r/${reference}`;
}

/**
 * Extracts the reference from a scanned link, or null if the link is not exactly
 * one of the accepted shapes. Query strings, fragments and extra path segments are
 * rejected so a QR cannot smuggle other data through.
 */
export function parseRecordLink(link: string, allowedHosts: readonly string[]): string | null {
  const appMatch = APP_LINK_PATTERN.exec(link);
  if (appMatch) {
    return appMatch[1];
  }

  const httpsMatch = HTTPS_LINK_PATTERN.exec(link);
  if (httpsMatch) {
    const host = httpsMatch[1].toLowerCase();
    const allowed = allowedHosts.some((candidate) => candidate.toLowerCase() === host);
    return allowed ? httpsMatch[2] : null;
  }

  return null;
}
