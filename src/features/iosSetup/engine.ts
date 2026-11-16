import type { ResolvedFlow, ResolvedStep } from './types';

// The practice is a small state machine kept free of any screen code so it can be tested on its own.
// The user must tap the highlighted element; any other tap gives a hint and changes nothing.

export type SessionState = {
  index: number;
  /** The target was tapped and its text is showing; the user presses Continue to move on. */
  filled: boolean;
  completed: boolean;
};

export type TapOutcome =
  | { kind: 'wrong'; hint: string }
  | { kind: 'filled' }
  | { kind: 'advanced' }
  | { kind: 'completed' };

export const startSession = (): SessionState => ({ index: 0, filled: false, completed: false });

export const currentStep = (flow: ResolvedFlow, state: SessionState): ResolvedStep =>
  flow.steps[Math.min(state.index, flow.steps.length - 1)];

function advance(flow: ResolvedFlow, state: SessionState): { state: SessionState; outcome: TapOutcome } {
  if (state.index >= flow.steps.length - 1) {
    return { state: { index: state.index, filled: false, completed: true }, outcome: { kind: 'completed' } };
  }
  return { state: { index: state.index + 1, filled: false, completed: false }, outcome: { kind: 'advanced' } };
}

export function tap(flow: ResolvedFlow, state: SessionState, elementId: string): { state: SessionState; outcome: TapOutcome } {
  const step = currentStep(flow, state);
  if (state.completed || state.filled || elementId !== step.target) {
    // While a filled text is showing, only Continue moves on.
    const hint = state.filled ? '' : (step.hints[elementId] ?? step.hint);
    return { state, outcome: { kind: 'wrong', hint } };
  }
  if (step.fill !== undefined) {
    return { state: { ...state, filled: true }, outcome: { kind: 'filled' } };
  }
  return advance(flow, state);
}

/** Continue after a filled text was shown. */
export function confirm(flow: ResolvedFlow, state: SessionState): { state: SessionState; outcome: TapOutcome } {
  if (!state.filled) return { state, outcome: { kind: 'wrong', hint: '' } };
  return advance(flow, state);
}

export function back(state: SessionState): SessionState {
  if (state.completed) return { ...state, completed: false, filled: false };
  if (state.filled) return { ...state, filled: false };
  return { ...state, index: Math.max(0, state.index - 1) };
}

/** "Step 4 of 9". The result screen counts as the last step. */
export function progress(flow: ResolvedFlow, state: SessionState): { current: number; total: number } {
  const step = currentStep(flow, state);
  return { current: step.number === 0 ? flow.total : step.number, total: flow.total };
}

/** The value to show in an element after it was filled (null when nothing was filled). */
export function filledText(flow: ResolvedFlow, state: SessionState, elementId: string): string | null {
  const step = currentStep(flow, state);
  return state.filled && step.fill?.elementId === elementId ? step.fill.text : null;
}
