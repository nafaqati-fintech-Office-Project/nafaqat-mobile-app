// The iPhone setup practice is driven by data, so a wrong label can be fixed from the backend without an app release.
// Everything the user reads inside the fake Shortcuts screens lives in this shape; the app only draws it.

export type Lang = 'en' | 'ar';
export type L10n = Record<Lang, string>;

export type FlowId = 'bank' | 'bank-extra' | 'wallet';

export type SimElement = {
  id: string;
  kind: 'row' | 'field' | 'button' | 'tabbar' | 'toggle' | 'text' | 'sms' | 'txn';
  label?: L10n;
  /** Right-hand text of a row, the placeholder of a field, or the second line of an sms / transaction. */
  value?: L10n;
  caption?: L10n;
  chevron?: boolean;
  on?: boolean;
  tabs?: { id: string; label: L10n }[];
  active?: string;
};

export type SimScreen = {
  title?: L10n;
  navLeft?: { id: string; label: L10n };
  navRight?: { id: string; label: L10n };
  elements: SimElement[];
};

export type Step = {
  id: string;
  /** What the user counts as a step. Several taps can belong to one step; 0 is the final result screen. */
  number: number;
  screen: SimScreen;
  /** The only element that moves the practice forward. */
  target: string;
  instruction: L10n;
  /** Shown after a wrong tap. */
  hint: L10n;
  /** Hints for particular wrong taps, by element id. */
  hints?: Record<string, L10n>;
  /** After the target is tapped, this text appears in the element (`{keyword}` is replaced) before moving on. */
  fill?: { elementId: string; text: L10n };
  afterFill?: L10n;
};

export type FlowDef = {
  steps: Step[];
  /** A flow can reuse the later steps of another one ("add another keyword" repeats practice steps 2 to 5). */
  basedOn?: FlowId;
  fromStepNumber?: number;
  /** Which of the configured keywords this flow types in. */
  keywordIndex?: number;
  /** Every real tap, for the "do it for real" screen. The practice is shorter than the real setup. */
  checklist?: L10n[];
};

export type Variant = {
  /** The lowest iOS major version this variant is for. The highest matching one is used. */
  minIos: number;
  flows: Record<FlowId, FlowDef>;
};

/** Timings the backend can change without an app release (the app ships sensible defaults). */
export type CaptureConfig = {
  /** SMS and Wallet describing the same purchase must be this close in time to be merged. */
  matchWindowMs: number;
  /** A complete Wallet payment waits this long for its SMS before it is saved on its own. */
  walletHoldMs: number;
  /** How long a held, incomplete Wallet item waits for its SMS before the user is asked to complete it. */
  incompleteWaitMs: number;
  /** No message for this many days: one banner and one push notification (at most once a week). */
  reminderDays: number;
};

export type SetupConfig = {
  version: number;
  capture?: Partial<CaptureConfig>;
  /** Words a bank message is matched on. The first is the main one, the second is for banks that also send Arabic. */
  keywords: string[];
  /** False until the wording has been compared with a real iPhone in that language. */
  labelsVerified: Record<Lang, boolean>;
  variants: Variant[];
};

// What the screens draw: one language chosen, the keyword filled in.

export type ResolvedElement = {
  id: string;
  kind: SimElement['kind'];
  label?: string;
  value?: string;
  caption?: string;
  chevron?: boolean;
  on?: boolean;
  tabs?: { id: string; label: string }[];
  active?: string;
};

export type ResolvedScreen = {
  title?: string;
  navLeft?: { id: string; label: string };
  navRight?: { id: string; label: string };
  elements: ResolvedElement[];
};

export type ResolvedStep = {
  id: string;
  number: number;
  screen: ResolvedScreen;
  target: string;
  instruction: string;
  hint: string;
  hints: Record<string, string>;
  fill?: { elementId: string; text: string };
  afterFill?: string;
};

export type ResolvedFlow = {
  id: FlowId;
  keyword: string;
  steps: ResolvedStep[];
  /** Every real tap in the real Shortcuts app, in order. */
  checklist: string[];
  /** Number of counted steps (the result screen is not counted). */
  total: number;
};
