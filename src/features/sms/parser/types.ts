export type ParsedTxn = {
  smsId: string;
  bank: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  merchant: string | null;
  cardLast4: string | null;
  date: number;
  raw: string;
};
