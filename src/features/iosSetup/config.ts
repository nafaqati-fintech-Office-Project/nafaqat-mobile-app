import { DEFAULT_SETUP_CONFIG } from './defaultConfig';
import type {
  FlowDef,
  FlowId,
  L10n,
  Lang,
  ResolvedElement,
  ResolvedFlow,
  ResolvedScreen,
  ResolvedStep,
  SetupConfig,
  SimElement,
  SimScreen,
  Step,
  Variant,
} from './types';

/** The setup steps. Today they are bundled with the app; the backend can later return the same shape instead. */
export function loadSetupConfig(): SetupConfig {
  return DEFAULT_SETUP_CONFIG;
}

/** The variant for this iOS version: the one with the highest minIos that is not above it (else the lowest). */
export function pickVariant(config: SetupConfig, iosMajor: number): Variant {
  const sorted = [...config.variants].sort((a, b) => a.minIos - b.minIos);
  const fitting = sorted.filter((v) => v.minIos <= iosMajor);
  return fitting.length > 0 ? fitting[fitting.length - 1] : sorted[0];
}

const text = (value: L10n | undefined, lang: Lang, keyword: string): string | undefined =>
  value === undefined ? undefined : value[lang].replaceAll('{keyword}', keyword);

function resolveElement(el: SimElement, lang: Lang, keyword: string): ResolvedElement {
  return {
    id: el.id,
    kind: el.kind,
    label: text(el.label, lang, keyword),
    value: text(el.value, lang, keyword),
    caption: text(el.caption, lang, keyword),
    chevron: el.chevron,
    on: el.on,
    tabs: el.tabs?.map((tab) => ({ id: tab.id, label: tab.label[lang] })),
    active: el.active,
  };
}

function resolveScreen(screen: SimScreen, lang: Lang, keyword: string): ResolvedScreen {
  return {
    title: text(screen.title, lang, keyword),
    navLeft: screen.navLeft && { id: screen.navLeft.id, label: screen.navLeft.label[lang] },
    navRight: screen.navRight && { id: screen.navRight.id, label: screen.navRight.label[lang] },
    elements: screen.elements.map((el) => resolveElement(el, lang, keyword)),
  };
}

function resolveStep(step: Step, lang: Lang, keyword: string): ResolvedStep {
  return {
    id: step.id,
    number: step.number,
    screen: resolveScreen(step.screen, lang, keyword),
    target: step.target,
    instruction: step.instruction[lang].replaceAll('{keyword}', keyword),
    hint: step.hint[lang],
    hints: Object.fromEntries(Object.entries(step.hints ?? {}).map(([id, hint]) => [id, hint[lang]])),
    fill: step.fill && { elementId: step.fill.elementId, text: text(step.fill.text, lang, keyword) ?? '' },
    afterFill: text(step.afterFill, lang, keyword),
  };
}

function stepsOf(variant: Variant, def: FlowDef): Step[] {
  if (def.basedOn === undefined) return def.steps;
  const base = variant.flows[def.basedOn];
  const from = def.fromStepNumber ?? 0;
  // The result screen (number 0) always stays at the end.
  return stepsOf(variant, base).filter((s) => s.number === 0 || s.number >= from);
}

function checklistOf(variant: Variant, def: FlowDef): L10n[] {
  if (def.checklist !== undefined) return def.checklist;
  return def.basedOn === undefined ? [] : checklistOf(variant, variant.flows[def.basedOn]);
}

export type ResolveOptions = { iosMajor: number; language: Lang; keywordIndex?: number };

/** One flow, in one language, with the keyword typed in, ready to draw. */
export function resolveFlow(config: SetupConfig, flowId: FlowId, options: ResolveOptions): ResolvedFlow {
  const variant = pickVariant(config, options.iosMajor);
  const def = variant.flows[flowId];
  const keywordIndex = options.keywordIndex ?? def.keywordIndex ?? 0;
  const keyword = config.keywords[keywordIndex] ?? config.keywords[0] ?? '';
  const steps = stepsOf(variant, def).map((s) => resolveStep(s, options.language, keyword));
  const total = new Set(steps.filter((s) => s.number > 0).map((s) => s.number)).size;
  const lines = checklistOf(variant, def).map((line) => text(line, options.language, keyword) ?? '');
  return { id: flowId, keyword, steps, checklist: lines, total };
}

/** The checklist shown on the "do it for real" screen: every real tap, numbered. */
export function checklist(flow: ResolvedFlow): { number: number; text: string }[] {
  return flow.checklist.map((line, index) => ({ number: index + 1, text: line }));
}
