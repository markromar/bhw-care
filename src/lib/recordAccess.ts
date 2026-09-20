/**
 * Resolves an opaque record reference to a place in the app.
 *
 * SKELETON. No record tables exist yet, so this always fails closed. The real
 * implementation (Day 3) will call a server-side function that checks the signed-in
 * user's role, barangay, purok/assignment and relationship to the record, and writes
 * an audit event for the scan. The mobile app never decides access on its own.
 */

export type RecordAccessResult =
  { status: 'allowed'; path: string } | { status: 'denied' } | { status: 'not_available' };

export async function resolveRecordReference(reference: string): Promise<RecordAccessResult> {
  void reference;
  return { status: 'not_available' };
}
