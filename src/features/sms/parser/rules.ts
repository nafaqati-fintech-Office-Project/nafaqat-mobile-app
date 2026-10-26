export type BankRule = {
  bank: string;
  senderMatch: RegExp;
  patterns: RegExp[];
};

export const CURRENCY_SRC = 'Rs\\.?|PKR|SAR|SR|AED|ر\\.?\\s?س|ريال|درهم';
export const AMOUNT_SRC = '[\\d٠-٩][\\d٠-٩,٬]*(?:[.٫][\\d٠-٩]+)?';

const CUR = `(?<![A-Za-z])(?<currency>${CURRENCY_SRC})`;
const AMT = `(?<amount>${AMOUNT_SRC})`;
const END =
  '(?=\\s+(?:on|via|using|ref|dated|avl|avail|available|bal|balance|card|from|completed|successful|successfully|has|have|is|was|against|visa|mastercard|raast|nickname|a\\/c|account|instrument|channel|destination)\\b|\\s+\\(\\S+@|(?:^|\\s)(?:عبر|بطاقة|في|بتاريخ|رصيد)(?:\\s|$)|[.,;](?:\\s|$)|\\s*$)';

const rx = (source: string) =>
  new RegExp(
    source.replaceAll('{CUR}', CUR).replaceAll('{AMT}', AMT).replaceAll('{END}', END),
    'i',
  );

const FROM = '(?:.*?\\bfrom\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END})?';

// Skip "to your account" / "from A/C ..." / "من بطاقتك": those name the user's own instrument, not a merchant.
const NOT_OWN =
  '(?!\\s*\\d{1,2}[:.]\\d{2})(?!(?:your|my)\\b)(?!(?:a/c|acct?|account|card|iban)\\b)(?!(?:بطاقة|حساب))';

export const GENERIC_BANK = 'GENERIC';

export const rules: BankRule[] = [
  {
    bank: 'Meezan',
    senderMatch: /meezan/i,
    patterns: [
      rx('purchase\\s+of\\s+{CUR}\\s*{AMT}\\s+at\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+(?:has\\s+been\\s+)?credited\\b${FROM}`),
    ],
  },
  {
    bank: 'HBL',
    senderMatch: /\bHBL\b/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+spent\\b.*?\\bat\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: 'UBL',
    senderMatch: /\bUBL\b/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+debited\\b.*?\\bat\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: 'ABL',
    senderMatch: /^(?:my)?ABL|allied/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+paid\\b.*?\\bto\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+received\\b${FROM}`),
    ],
  },
  {
    bank: 'NayaPay',
    senderMatch: /nayapay/i,
    patterns: [
      rx('sent\\s+{CUR}\\s*{AMT}\\s+to\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx('received\\s+{CUR}\\s*{AMT}(?:\\s+from\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END})?'),
    ],
  },
  {
    bank: 'Alinma',
    senderMatch: /alinma|الإنماء|الانماء/i,
    patterns: [
      rx('purchase\\s+{CUR}\\s*{AMT}\\s+at\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx('deposit\\s+{CUR}\\s*{AMT}'),
      rx('شراء.*?بمبلغ\\s*{AMT}\\s*{CUR}(?:\\s*من\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END})?'),
      rx('إيداع.*?{AMT}\\s*{CUR}'),
    ],
  },
  {
    bank: 'Al Rajhi',
    senderMatch: /rajhi|الراجحي/i,
    patterns: [
      rx('purchase\\s+{CUR}\\s*{AMT}\\s+at\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
      rx('إيداع.*?{AMT}\\s*{CUR}'),
    ],
  },
  {
    bank: 'SNB',
    senderMatch: /^SNB|alahli|الأهلي/i,
    patterns: [
      rx('purchase\\s+of\\s+{CUR}\\s*{AMT}\\s+(?:at|from)\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+deposited\\b${FROM}`),
    ],
  },
  {
    bank: 'Emirates NBD',
    senderMatch: /ENBD|emirates\s?nbd/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+spent\\b.*?\\bat\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: GENERIC_BANK,
    senderMatch: /^/,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+has\\s+been\\s+successfully\\s+sent\\s+to\\s+(?<merchant>.+?)\\s+of\\s+IBAN\\b'),
      rx('{CUR}\\s*{AMT}.*?\\bat\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      rx('{AMT}\\s*{CUR}.*?\\bat\\s+(?!\\s*\\d{1,2}[:.]\\d{2})(?<merchant>.+?){END}'),
      // Allied: "Transaction description : PURCHASE <merchant>"; NayaPay receipts: "Merchant Details <merchant>"
      // and "Destination Acc. Title <name>".
      rx('{CUR}\\s*{AMT}.*?\\bdescription\\s*:\\s*(?:purchase|pos)\\s+(?<merchant>.+?){END}'),
      rx('{CUR}\\s*{AMT}.*?\\bmerchant\\s+details\\s+(?<merchant>.+?){END}'),
      rx('\\b(?:sent|paid)\\s+{CUR}\\s*{AMT}.*?\\bdestination\\s+acc\\.?\\s+title\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+(?:(?:has|have)\\s+been\\s+)?(?:paid|sent|transferred)\\s+to\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      // Statement/receipt order, amount last: "Paid to SHOP Raast ... -Rs. 70", "Money received from NAME (id@nayapay) ... +Rs. 1,390"
      rx(`\\b(?:paid\\s+to|money\\s+(?:sent\\s+to|received\\s+from))\\s+${NOT_OWN}(?<merchant>.+?){END}.*?{CUR}\\s*{AMT}`),
      // "Rs. 18,600 paid via 1Bill to SNGPL"
      rx(`{CUR}\\s*{AMT}\\s+(?:paid|sent)\\s+via\\s+\\S+\\s+to\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      rx('{CUR}\\s*{AMT}.*?\\bpos\\s+purchase\\s+(?<merchant>.+?){END}'),
      rx(`(?:sent|paid|transfer|payment)\\s+of\\s+{CUR}\\s*{AMT}\\s+to\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      rx(`{CUR}\\s*{AMT}\\s+to\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      rx(`{CUR}\\s*{AMT}.*?\\bfrom\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      rx(`{AMT}\\s*{CUR}.*?(?:^|\\s)(?:لدى|عند)\\s+(?<merchant>.+?){END}`),
      rx(`{AMT}\\s*{CUR}.*?(?:^|\\s)من\\s+${NOT_OWN}(?<merchant>.+?){END}`),
      rx('{CUR}\\s*{AMT}'),
      rx('{AMT}\\s*{CUR}'),
    ],
  },
];
