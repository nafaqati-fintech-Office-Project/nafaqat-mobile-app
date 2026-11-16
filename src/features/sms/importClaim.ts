// A message's fingerprint for the server's initial-import grant: only the inbox id and the date, never the text.
// Recomputed from a stored row (sms_id and date) when the sync sends it, so the server can match the two.
export const smsFingerprint = (smsId: string, date: number): string => `sms-${smsId}-${date}`;
