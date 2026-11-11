import SmsAndroid, { type SmsFilter } from 'react-native-get-sms-android';

export type SmsMessage = {
  id: string;
  address: string;
  body: string;
  date: number;
};

type ReadInboxOptions = {
  limit: number;
  minDate?: number;
};

type RawSms = { _id: number | string; address?: string; body?: string; date: number | string };

function list(filter: SmsFilter): Promise<SmsMessage[]> {
  return new Promise((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (error) => reject(new Error(error)),
      (_count, smsList) => {
        try {
          const raw = JSON.parse(smsList) as RawSms[];
          resolve(
            raw.map((m) => ({
              id: String(m._id),
              address: m.address ?? '',
              body: m.body ?? '',
              date: Number(m.date),
            })),
          );
        } catch (error) {
          reject(error);
        }
      },
    );
  });
}

export function readInbox({ limit, minDate }: ReadInboxOptions): Promise<SmsMessage[]> {
  const filter: SmsFilter = { box: 'inbox', maxCount: limit, sortOrder: 'date DESC' };
  if (minDate !== undefined) filter.minDate = minDate;
  return list(filter);
}

// One message by its inbox id, or null when it is no longer there.
export async function readSmsById(id: string): Promise<SmsMessage | null> {
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) return null;
  const [message] = await list({ box: 'inbox', _id: numeric, maxCount: 1 });
  return message?.id === id ? message : null;
}
