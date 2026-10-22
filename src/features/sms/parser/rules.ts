export type BankRule = {
  bank: string;
  senderMatch: RegExp;
  patterns: RegExp[];
};

export const CURRENCY_SRC = 'Rs\\.?|PKR|SAR|SR|AED|ر\\.?\\s?س|ريال|درهم';
export const AMOUNT_SRC = '[\\d٠-٩][\\d٠-٩,٬]*(?:[.٫][\\d٠-٩]+)?';

const CUR = `(?<![A-Za-z])(?<currency>${CURRENCY_SRC})`;
const AMT = `(?<amount>${AMOUNT_SRC})`;
const END = '(?=\\s+(?:on|via|using|ref|dated|avl|avail|available|bal|balance|card|from)\\b|[.,;](?:\\s|$)|\\s*$)';

const rx = (source: string) =>
  new RegExp(
    source.replaceAll('{CUR}', CUR).replaceAll('{AMT}', AMT).replaceAll('{END}', END),
    'i',
  );

const FROM = '(?:.*?\\bfrom\\s+(?<merchant>.+?){END})?';

export const GENERIC_BANK = 'GENERIC';

export const rules: BankRule[] = [
  {
    bank: 'Meezan',
    senderMatch: /meezan/i,
    patterns: [
      rx('purchase\\s+of\\s+{CUR}\\s*{AMT}\\s+at\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+(?:has\\s+been\\s+)?credited\\b${FROM}`),
    ],
  },
  {
    bank: 'HBL',
    senderMatch: /\bHBL\b/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+spent\\b.*?\\bat\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: 'UBL',
    senderMatch: /\bUBL\b/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+debited\\b.*?\\bat\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: 'ABL',
    senderMatch: /^(?:my)?ABL|allied/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+paid\\b.*?\\bto\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+received\\b${FROM}`),
    ],
  },
  {
    bank: 'NayaPay',
    senderMatch: /nayapay/i,
    patterns: [
      rx('sent\\s+{CUR}\\s*{AMT}\\s+to\\s+(?<merchant>.+?){END}'),
      rx('received\\s+{CUR}\\s*{AMT}(?:\\s+from\\s+(?<merchant>.+?){END})?'),
    ],
  },
  {
    bank: 'Alinma',
    senderMatch: /alinma|الإنماء|الانماء/i,
    patterns: [
      rx('purchase\\s+{CUR}\\s*{AMT}\\s+at\\s+(?<merchant>.+?){END}'),
      rx('deposit\\s+{CUR}\\s*{AMT}'),
      rx('شراء.*?بمبلغ\\s*{AMT}\\s*{CUR}(?:\\s*من\\s+(?<merchant>.+?){END})?'),
      rx('إيداع.*?{AMT}\\s*{CUR}'),
    ],
  },
  {
    bank: 'Al Rajhi',
    senderMatch: /rajhi|الراجحي/i,
    patterns: [
      rx('purchase\\s+{CUR}\\s*{AMT}\\s+at\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
      rx('إيداع.*?{AMT}\\s*{CUR}'),
    ],
  },
  {
    bank: 'SNB',
    senderMatch: /^SNB|alahli|الأهلي/i,
    patterns: [
      rx('purchase\\s+of\\s+{CUR}\\s*{AMT}\\s+(?:at|from)\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+deposited\\b${FROM}`),
    ],
  },
  {
    bank: 'Emirates NBD',
    senderMatch: /ENBD|emirates\s?nbd/i,
    patterns: [
      rx('{CUR}\\s*{AMT}\\s+spent\\b.*?\\bat\\s+(?<merchant>.+?){END}'),
      rx(`{CUR}\\s*{AMT}\\s+credited\\b${FROM}`),
    ],
  },
  {
    bank: GENERIC_BANK,
    senderMatch: /^/,
    patterns: [
      rx('{CUR}\\s*{AMT}.*?\\bat\\s+(?<merchant>.+?){END}'),
      rx('{AMT}\\s*{CUR}.*?\\bat\\s+(?<merchant>.+?){END}'),
      rx('{CUR}\\s*{AMT}'),
      rx('{AMT}\\s*{CUR}'),
    ],
  },
];
