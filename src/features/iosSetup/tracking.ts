import { appendEvent } from './storage';
import type { FlowId } from './types';

// The setup funnel, so it can be measured: started, each step, completed, Shortcuts opened, abandoned (and where).
// Events carry only ids and numbers, never message text. They are kept on the device for now; a later change sends
// them to the backend together with "first message received".

export type SetupEvent =
  | 'sim_started'
  | 'sim_step_completed'
  | 'sim_completed'
  | 'sim_abandoned'
  | 'keyword_copied'
  | 'shortcuts_opened'
  | 'returned_from_shortcuts'
  | 'setup_confirmed'
  | 'test_sent'
  | 'connected'
  | 'test_timeout'
  | 'first_message_received';

export function trackSetup(event: SetupEvent, props: { flow: FlowId; step?: string; number?: number }): void {
  void appendEvent({ event, at: new Date().toISOString(), ...props });
}
