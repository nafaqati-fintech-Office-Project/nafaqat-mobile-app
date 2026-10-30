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
};

export type Contribution = {
  id: string;
  goalId: string;
  amount: string;
  note: string | null;
  createdAt: Date;
};

// What the create and edit form sends. targetDate is yyyy-MM-dd.
export type GoalInput = {
  name: string;
  description: string | null;
  targetAmount: string;
  currency: string;
  targetDate: string | null;
};
