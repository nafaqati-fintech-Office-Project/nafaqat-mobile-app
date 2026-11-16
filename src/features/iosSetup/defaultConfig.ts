import type { FlowDef, L10n, SetupConfig, SimElement, SimScreen, Step } from './types';

// The setup practice shipped with the app. The same shape can come from the backend and replace it.
//
// IMPORTANT: the labels of Apple's own screens (tab names, trigger names, field names) must be checked on a real
// iPhone in each language. English is written from the iOS 17 Shortcuts app; the Arabic Apple labels are a best
// effort and are marked unverified in `labelsVerified` until someone compares them with a real device.

const L = (en: string, ar: string): L10n => ({ en, ar });

const KEYWORD_PLACEHOLDER = '{keyword}';

const row = (id: string, label: L10n, extra: Partial<SimElement> = {}): SimElement => ({ id, kind: 'row', label, ...extra });

const triggersScreen: SimScreen = {
  title: L('New Automation', 'أتمتة جديدة'),
  navLeft: { id: 'cancel', label: L('Cancel', 'إلغاء') },
  elements: [
    row('time', L('Time of Day', 'وقت اليوم'), { chevron: true }),
    row('arrive', L('Arrive', 'الوصول'), { chevron: true }),
    row('email', L('Email', 'البريد الإلكتروني'), { chevron: true }),
    row('message', L('Message', 'رسالة'), { chevron: true }),
    row('transaction', L('Transaction', 'معاملة'), { chevron: true }),
    row('wifi', L('Wi-Fi', 'واي فاي'), { chevron: true }),
  ],
};

const messageScreen = (stage: 'contains' | 'run' | 'next'): SimScreen => ({
  title: L('Message', 'رسالة'),
  navLeft: { id: 'cancel', label: L('Cancel', 'إلغاء') },
  navRight: stage === 'next' ? { id: 'next', label: L('Next', 'التالي') } : undefined,
  elements: [
    row('sender', L('Sender', 'المرسل'), { value: L('Choose', 'اختر'), chevron: true }),
    {
      id: 'contains',
      kind: 'field',
      label: L('Message Contains', 'الرسالة تحتوي على'),
      // After step 4 the keyword stays in the field on the screens that follow.
      value: stage === 'contains' ? L('Text', 'نص') : L(KEYWORD_PLACEHOLDER, KEYWORD_PLACEHOLDER),
    },
    ...(stage === 'contains'
      ? []
      : [
          row('immediately', L('Run Immediately', 'تشغيل فوري')),
          row('confirm', L('Run After Confirmation', 'تشغيل بعد التأكيد')),
          { id: 'notify', kind: 'toggle', label: L('Notify When Run', 'إشعار عند التشغيل'), on: false } as SimElement,
        ]),
  ],
});

const transactionScreen = (stage: 'cards' | 'run' | 'next'): SimScreen => ({
  title: L('Transaction', 'معاملة'),
  navLeft: { id: 'cancel', label: L('Cancel', 'إلغاء') },
  navRight: stage === 'next' ? { id: 'next', label: L('Next', 'التالي') } : undefined,
  elements: [
    row('cards', L('Card', 'البطاقة'), { value: L('Choose', 'اختر'), chevron: true }),
    ...(stage === 'cards'
      ? []
      : [
          row('immediately', L('Run Immediately', 'تشغيل فوري')),
          row('confirm', L('Run After Confirmation', 'تشغيل بعد التأكيد')),
          { id: 'notify', kind: 'toggle', label: L('Notify When Run', 'إشعار عند التشغيل'), on: false } as SimElement,
        ]),
  ],
});

const searchScreen: SimScreen = {
  title: L('Add Action', 'إضافة إجراء'),
  elements: [
    { id: 'search', kind: 'field', label: L('Search', 'بحث'), value: L('Nafaqati', 'نفقاتي') },
    row('action-bank', L('Log bank message', 'تسجيل رسالة بنكية'), { caption: L('Nafaqati', 'نفقاتي') }),
    row('action-card', L('Log card payment', 'تسجيل دفعة بطاقة'), { caption: L('Nafaqati', 'نفقاتي') }),
  ],
};

const paramScreen = (action: L10n, fields: { id: string; label: L10n }[]): SimScreen => ({
  title: L('New Automation', 'أتمتة جديدة'),
  elements: [
    { id: 'action', kind: 'text', label: action },
    ...fields.map((f): SimElement => ({ id: f.id, kind: 'field', label: f.label, value: L('Value', 'القيمة') })),
  ],
});

const variablesScreen: SimScreen = {
  title: L('Variables', 'المتغيرات'),
  elements: [
    row('var-input', L('Shortcut Input', 'إدخال الاختصار')),
    row('var-date', L('Current Date', 'التاريخ الحالي')),
    row('var-clip', L('Clipboard', 'الحافظة')),
  ],
};

const doneScreen = (summary: L10n): SimScreen => ({
  title: L('New Automation', 'أتمتة جديدة'),
  navRight: { id: 'done', label: L('Done', 'تم') },
  elements: [
    { id: 'summary', kind: 'text', label: summary },
    row('action', L('Log bank message', 'تسجيل رسالة بنكية'), { caption: L('Message: Shortcut Input', 'الرسالة: إدخال الاختصار') }),
  ],
});

const resultScreen = (kind: 'bank' | 'wallet'): SimScreen => ({
  title: L('Nafaqati', 'نفقاتي'),
  elements: [
    kind === 'bank'
      ? {
          id: 'sms',
          kind: 'sms',
          label: L('Your bank', 'البنك'),
          value: L('Purchase SAR 45.00 at Starbucks, mada card *1234', 'شراء بمبلغ 45.00 ريال من ستاربكس، بطاقة مدى *1234'),
        }
      : { id: 'sms', kind: 'sms', label: L('Apple Pay', 'Apple Pay'), value: L('Starbucks, SAR 45.00', 'ستاربكس، 45.00 ريال') },
    {
      id: 'txn',
      kind: 'txn',
      label: L('Starbucks', 'ستاربكس'),
      value: L('- SAR 45.00', '- 45.00 ريال'),
      caption: L('Food & Drinks', 'طعام ومشروبات'),
    },
    { id: 'continue', kind: 'button', label: L('Continue', 'متابعة') },
  ],
});

const step = (s: Step): Step => s;

// The practice teaches only the taps where people go wrong (5 steps). The checklist after it still lists every real tap.
const bankSteps: Step[] = [
  step({
    id: 'bank-1', number: 1, screen: triggersScreen, target: 'message',
    instruction: L('In Shortcuts, tap Automation, then +. Then choose Message.', 'في الاختصارات اضغط على الأتمتة ثم +. ثم اختر رسالة.'),
    hint: L('Look for Message in the list.', 'ابحث عن رسالة في القائمة.'),
    hints: { transaction: L('That one is for Apple Pay. For bank messages choose Message.', 'هذا لـ Apple Pay. لرسائل البنك اختر رسالة.') },
  }),
  step({
    id: 'bank-2', number: 2, screen: messageScreen('contains'), target: 'contains',
    instruction: L('Tap Message Contains.', 'اضغط على الرسالة تحتوي على.'),
    hint: L('Tap the Message Contains field.', 'اضغط على حقل الرسالة تحتوي على.'),
    fill: { elementId: 'contains', text: L(KEYWORD_PLACEHOLDER, KEYWORD_PLACEHOLDER) },
    afterFill: L('That is your keyword. In the real app Nafaqati copies it for you, so you only paste it.', 'هذه كلمتك المفتاحية. في التطبيق الحقيقي ننسخها لك فتلصقها فقط.'),
  }),
  step({
    id: 'bank-3a', number: 3, screen: messageScreen('run'), target: 'immediately',
    instruction: L('Choose Run Immediately.', 'اختر تشغيل فوري.'),
    hint: L('Choose Run Immediately so it works without you.', 'اختر تشغيل فوري ليعمل دون تدخل منك.'),
    hints: {
      confirm: L('That one asks you every time. Choose Run Immediately.', 'هذا يسألك في كل مرة. اختر تشغيل فوري.'),
      notify: L('Leave Notify When Run switched off.', 'اترك إشعار عند التشغيل مغلقًا.'),
    },
    fill: { elementId: 'immediately', text: L('Selected', 'محدد') },
    afterFill: L('Run Immediately is on and Notify When Run stays off.', 'تشغيل فوري مفعّل وإشعار عند التشغيل يبقى مغلقًا.'),
  }),
  step({
    id: 'bank-3b', number: 3, screen: messageScreen('next'), target: 'next',
    instruction: L('Tap Next.', 'اضغط على التالي.'),
    hint: L('Tap Next at the top.', 'اضغط على التالي في الأعلى.'),
  }),
  step({
    id: 'bank-4a', number: 4, screen: searchScreen, target: 'action-bank',
    instruction: L('Search for Nafaqati and tap Log bank message.', 'ابحث عن نفقاتي واضغط على تسجيل رسالة بنكية.'),
    hint: L('Pick Log bank message.', 'اختر تسجيل رسالة بنكية.'),
    hints: { 'action-card': L('That one is for Apple Pay. Pick Log bank message.', 'هذا لـ Apple Pay. اختر تسجيل رسالة بنكية.') },
  }),
  step({
    id: 'bank-4b', number: 4, screen: paramScreen(L('Log bank message', 'تسجيل رسالة بنكية'), [{ id: 'param-message', label: L('Message', 'الرسالة') }]),
    target: 'param-message',
    instruction: L('Tap the Message field.', 'اضغط على حقل الرسالة.'),
    hint: L('Tap the Message field.', 'اضغط على حقل الرسالة.'),
  }),
  step({
    id: 'bank-4c', number: 4, screen: variablesScreen, target: 'var-input',
    instruction: L('Choose Shortcut Input.', 'اختر إدخال الاختصار.'),
    hint: L('Choose Shortcut Input. It is the message that arrived.', 'اختر إدخال الاختصار. إنه الرسالة التي وصلت.'),
  }),
  step({
    id: 'bank-5', number: 5,
    screen: doneScreen(L('When I get a message containing "{keyword}", run immediately.', 'عند وصول رسالة تحتوي على "{keyword}"، شغّل فورًا.')),
    target: 'done',
    instruction: L('Tap Done. Your automation is ready.', 'اضغط على تم. أتمتتك جاهزة.'),
    hint: L('Tap Done at the top.', 'اضغط على تم في الأعلى.'),
  }),
  step({
    id: 'bank-result', number: 0, screen: resultScreen('bank'), target: 'continue',
    instruction: L('From now on a bank message like this appears in Nafaqati by itself.', 'من الآن تظهر رسالة بنكية كهذه في نفقاتي تلقائيًا.'),
    hint: L('Tap Continue.', 'اضغط على متابعة.'),
  }),
];

const walletSteps: Step[] = [
  step({
    id: 'wallet-1', number: 1, screen: triggersScreen, target: 'transaction',
    instruction: L('In Shortcuts, tap Automation, then +. Then choose Transaction.', 'في الاختصارات اضغط على الأتمتة ثم +. ثم اختر معاملة.'),
    hint: L('Look for Transaction in the list.', 'ابحث عن معاملة في القائمة.'),
    hints: { message: L('That one is for bank messages. For Apple Pay choose Transaction.', 'هذا لرسائل البنك. لـ Apple Pay اختر معاملة.') },
  }),
  step({
    id: 'wallet-2', number: 2, screen: transactionScreen('cards'), target: 'cards',
    instruction: L('Tap Card and choose your cards.', 'اضغط على البطاقة واختر بطاقاتك.'),
    hint: L('Tap the Card row.', 'اضغط على صف البطاقة.'),
    fill: { elementId: 'cards', text: L('All cards', 'كل البطاقات') },
    afterFill: L('Choose the cards you pay with in Apple Wallet.', 'اختر البطاقات التي تدفع بها في محفظة Apple.'),
  }),
  step({
    id: 'wallet-3a', number: 3, screen: transactionScreen('run'), target: 'immediately',
    instruction: L('Choose Run Immediately.', 'اختر تشغيل فوري.'),
    hint: L('Choose Run Immediately so it works without you.', 'اختر تشغيل فوري ليعمل دون تدخل منك.'),
    hints: {
      confirm: L('That one asks you every time. Choose Run Immediately.', 'هذا يسألك في كل مرة. اختر تشغيل فوري.'),
      notify: L('Leave Notify When Run switched off.', 'اترك إشعار عند التشغيل مغلقًا.'),
    },
    fill: { elementId: 'immediately', text: L('Selected', 'محدد') },
    afterFill: L('Run Immediately is on and Notify When Run stays off.', 'تشغيل فوري مفعّل وإشعار عند التشغيل يبقى مغلقًا.'),
  }),
  step({
    id: 'wallet-3b', number: 3, screen: transactionScreen('next'), target: 'next',
    instruction: L('Tap Next.', 'اضغط على التالي.'),
    hint: L('Tap Next at the top.', 'اضغط على التالي في الأعلى.'),
  }),
  step({
    id: 'wallet-4a', number: 4, screen: searchScreen, target: 'action-card',
    instruction: L('Search for Nafaqati and tap Log card payment.', 'ابحث عن نفقاتي واضغط على تسجيل دفعة بطاقة.'),
    hint: L('Pick Log card payment.', 'اختر تسجيل دفعة بطاقة.'),
    hints: { 'action-bank': L('That one is for bank messages. Pick Log card payment.', 'هذا لرسائل البنك. اختر تسجيل دفعة بطاقة.') },
  }),
  ...(['merchant', 'amount', 'card'] as const).map((field): Step => {
    const labels = {
      merchant: L('Merchant', 'التاجر'),
      amount: L('Amount', 'المبلغ'),
      card: L('Card', 'البطاقة'),
    };
    return step({
      id: `wallet-4-${field}`, number: 4,
      screen: paramScreen(L('Log card payment', 'تسجيل دفعة بطاقة'), [
        { id: 'param-merchant', label: labels.merchant },
        { id: 'param-amount', label: labels.amount },
        { id: 'param-card', label: labels.card },
      ]),
      target: `param-${field}`,
      instruction: L(`Tap ${labels[field].en} and choose Shortcut Input.`, `اضغط على ${labels[field].ar} واختر إدخال الاختصار.`),
      hint: L(`Tap the ${labels[field].en} field.`, `اضغط على حقل ${labels[field].ar}.`),
      fill: { elementId: `param-${field}`, text: L('Shortcut Input', 'إدخال الاختصار') },
      afterFill: L('Shortcut Input carries the payment details from Apple Wallet.', 'إدخال الاختصار يحمل تفاصيل الدفع من محفظة Apple.'),
    });
  }),
  step({
    id: 'wallet-5', number: 5,
    screen: doneScreen(L('When I pay with Apple Pay, run immediately.', 'عند الدفع بـ Apple Pay، شغّل فورًا.')),
    target: 'done',
    instruction: L('Tap Done. Your automation is ready.', 'اضغط على تم. أتمتتك جاهزة.'),
    hint: L('Tap Done at the top.', 'اضغط على تم في الأعلى.'),
  }),
  step({
    id: 'wallet-result', number: 0, screen: resultScreen('wallet'), target: 'continue',
    instruction: L('From now on every Apple Pay payment appears in Nafaqati by itself.', 'من الآن تظهر كل دفعة Apple Pay في نفقاتي تلقائيًا.'),
    hint: L('Tap Continue.', 'اضغط على متابعة.'),
  }),
];

// Every real tap, in order. This is the list the user follows in the real Shortcuts app (the practice above is shorter).
const bankChecklist: L10n[] = [
  L('Tap the Automation tab.', 'اضغط على تبويب الأتمتة.'),
  L('Tap the + button.', 'اضغط على زر +.'),
  L('Choose Message.', 'اختر رسالة.'),
  L('Tap Message Contains and paste "{keyword}".', 'اضغط على الرسالة تحتوي على والصق "{keyword}".'),
  L('Choose Run Immediately. Leave Notify When Run off.', 'اختر تشغيل فوري. اترك إشعار عند التشغيل مغلقًا.'),
  L('Tap Next, then New Blank Automation.', 'اضغط على التالي ثم أتمتة فارغة جديدة.'),
  L('Search for Nafaqati and tap Log bank message.', 'ابحث عن نفقاتي واضغط على تسجيل رسالة بنكية.'),
  L('Tap the Message field and choose Shortcut Input.', 'اضغط على حقل الرسالة واختر إدخال الاختصار.'),
  L('Tap Done.', 'اضغط على تم.'),
];

const walletChecklist: L10n[] = [
  L('Tap the Automation tab.', 'اضغط على تبويب الأتمتة.'),
  L('Tap the + button.', 'اضغط على زر +.'),
  L('Choose Transaction.', 'اختر معاملة.'),
  L('Tap Card and choose your cards.', 'اضغط على البطاقة واختر بطاقاتك.'),
  L('Choose Run Immediately. Leave Notify When Run off.', 'اختر تشغيل فوري. اترك إشعار عند التشغيل مغلقًا.'),
  L('Tap Next, then New Blank Automation.', 'اضغط على التالي ثم أتمتة فارغة جديدة.'),
  L('Search for Nafaqati and tap Log card payment.', 'ابحث عن نفقاتي واضغط على تسجيل دفعة بطاقة.'),
  L('Set Merchant, Amount and Card to Shortcut Input.', 'اجعل التاجر والمبلغ والبطاقة إدخال الاختصار.'),
  L('Tap Done.', 'اضغط على تم.'),
];

const bank: FlowDef = { steps: bankSteps, checklist: bankChecklist };

export const DEFAULT_SETUP_CONFIG: SetupConfig = {
  version: 1,
  // To be agreed with the team and tested against real bank messages. Banks that send Arabic and English need both.
  keywords: ['SAR', 'ريال'],
  labelsVerified: { en: false, ar: false },
  variants: [
    {
      minIos: 17,
      flows: {
        bank,
        'bank-extra': { steps: [], basedOn: 'bank', fromStepNumber: 2, keywordIndex: 1 },
        wallet: { steps: walletSteps, checklist: walletChecklist },
      },
    },
  ],
};
