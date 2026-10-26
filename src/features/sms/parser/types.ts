export type ParsedTxn = {
  smsId: string;
  bank: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  merchant: string | null;
  cardLast4: string | null;
  // Optional so existing producers (repo, tests) keep compiling; the parser always sets them.
  balance?: string | null;
  // Transaction time written in the SMS body, when present (ms epoch); `date` is the receive time.
  txnDate?: number | null;
  date: number;
  raw: string;
};
