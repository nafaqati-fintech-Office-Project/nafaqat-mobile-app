import type { FamilyProblem } from './familyApi';
import { t } from '@/i18n';

// What the problem was about, so the same status code can say something more useful.
export type ProblemContext = 'family' | 'invite' | 'invitation' | 'member' | 'share';

// A friendly message for a failed request; the server's own text is never shown.
export function problemText(problem: FamilyProblem, context: ProblemContext): string {
  if (problem === 'conflict' && context === 'invite') return t('family.error.alreadyInvited');
  if (problem === 'conflict' && context === 'share') return t('family.error.alreadyShared');
  if (problem === 'notFound' && context === 'invite') return t('family.error.userNotFound');
  return t(`family.error.${problem}`);
}
