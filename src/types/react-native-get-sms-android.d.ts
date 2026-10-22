declare module 'react-native-get-sms-android' {
  type SmsFilter = {
    box?: 'inbox' | 'sent' | 'draft' | '';
    minDate?: number;
    maxDate?: number;
    maxCount?: number;
    indexFrom?: number;
    sortOrder?: string;
  };

  const SmsAndroid: {
    list(
      filter: string,
      onFail: (error: string) => void,
      onSuccess: (count: number, smsList: string) => void,
    ): void;
  };

  export type { SmsFilter };
  export default SmsAndroid;
}
