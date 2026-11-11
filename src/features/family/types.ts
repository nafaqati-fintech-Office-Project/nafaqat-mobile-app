// The Family Portal, as the family, budget, transaction and reports services send it through the gateway.
// Amounts are decimal strings, like everywhere else in the app.

export type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';
export type UsageStatus = 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

// The currencies the family service accepts.
export const FAMILY_CURRENCIES = ['PKR', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR'] as const;

export type Family = {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  timeZone: string;
  myRole: FamilyRole;
};

// The service sends no names for members, only their user id.
export type Member = { id: string; userId: string; role: FamilyRole };

export type Invitation = {
  id: string;
  familyId: string;
  familyName: string;
  invitedUserId: string;
  role: FamilyRole;
  status: InvitationStatus;
};

export type SharedTransaction = {
  id: string;
  sharedBy: string;
  amount: string;
  currency: string;
  categoryCode: string;
  merchant: string | null;
  date: Date;
};

export type SharedPage = { items: SharedTransaction[]; page: number; hasMore: boolean };

export type CategoryShare = { categoryCode: string; total: string; sharePercent: number };

// The family's active budget measured against what members shared. "none": the family has no active budget.
export type BudgetSummary =
  | { state: 'available'; budgetId: string; budgeted: string; spent: string; remaining: string; percent: number; status: UsageStatus }
  | { state: 'none' }
  | { state: 'unavailable' };

export type FamilyDashboard = {
  month: string; // yyyy-MM
  currency: string;
  activeMembers: number;
  totalShared: string;
  sharedCount: number;
  // vs the month before; null when that month had nothing to compare with
  changePercent: number | null;
  budget: BudgetSummary;
  categories: CategoryShare[];
  // Other currencies the members shared are counted here, never added in.
  otherCurrencies: { currency: string; count: number }[];
};

export type BudgetLine = { categoryCode: string; limit: string; spent: string; percent: number; status: UsageStatus };

export type BudgetUtilization = {
  currency: string;
  totalLimit: string;
  totalSpent: string;
  percent: number;
  status: UsageStatus;
  lines: BudgetLine[];
};
