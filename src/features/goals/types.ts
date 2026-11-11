// Mirrors the goal service (GoalResponse, ContributionResponse). Money is a decimal string.

// COMPLETED can be reopened; CANCELLED is final. Deleted goals are never listed.
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type Goal = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: string;
  savedAmount: string;
  currency: string;
  targetDate: Date | null;
  status: GoalStatus;
  createdAt: Date;
  // Auto-save: transfers to the user's own savings account (read from bank SMS) whose text contains the keyword
  // fund this goal without anything being typed.
  autoSave: boolean;
  autoSaveKeyword: string | null;
};

// MANUAL: added by the user. AUTO: a saving transfer read from bank SMS; it follows that transaction.
export type ContributionSource = 'MANUAL' | 'AUTO';

export type Contribution = {
  id: string;
  goalId: string;
  amount: string;
  note: string | null;
  createdAt: Date;
  source: ContributionSource;
};

// What the create and edit form sends. targetDate is yyyy-MM-dd.
export type GoalInput = {
  name: string;
  description: string | null;
  targetAmount: string;
  currency: string;
  targetDate: string | null;
  autoSave: boolean;
  autoSaveKeyword: string | null;
};
