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

export function readInbox({ limit, minDate }: ReadInboxOptions): Promise<SmsMessage[]> {
  const filter: SmsFilter = { box: 'inbox', maxCount: limit, sortOrder: 'date DESC' };
  if (minDate !== undefined) filter.minDate = minDate;

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
