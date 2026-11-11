import { isAxiosError } from 'axios';

import type {
  BudgetSummary,
  BudgetUtilization,
  CategoryShare,
  Family,
  FamilyDashboard,
  FamilyRole,
  Invitation,
  InvitationStatus,
  Member,
  SharedPage,
  SharedTransaction,
  UsageStatus,
} from './types';
import { api } from '@/api/client';
import { arr, decimal, num, obj, str } from '@/api/parse';

// All through the gateway: family-service, budget-service, transaction-service and reports-analytics-service
// under /api/families/** and /api/transactions/{id}/shares. The caller is the JWT; nothing identifying is sent.
const F = '/api/families';
const path = (...parts: string[]) => [F, ...parts.map(encodeURIComponent)].join('/');

const ROLES: FamilyRole[] = ['OWNER', 'ADMIN', 'MEMBER'];
const STATUSES: InvitationStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED'];
const USAGE: UsageStatus[] = ['ON_TRACK', 'WARNING', 'EXCEEDED'];

function oneOf<T extends string>(list: readonly T[], value: unknown): T {
  const found = list.find((item) => item === value);
  if (!found) throw new Error('Unexpected value in response');
  return found;
}

const optionalText = (value: unknown) => (value === null || value === undefined ? null : str(value));
const optionalNumber = (value: unknown) => (value === null || value === undefined ? null : num(value));

export function parseFamily(raw: unknown): Family {
  const body = obj(raw);
  return {
    id: str(body.id),
    name: str(body.name),
    description: optionalText(body.description),
    currency: str(body.currency),
    timeZone: str(body.timeZone),
    myRole: oneOf(ROLES, body.myRole),
  };
}

export function parseMember(raw: unknown): Member {
  const body = obj(raw);
  return { id: str(body.id), userId: str(body.userId), role: oneOf(ROLES, body.role) };
}

export function parseInvitation(raw: unknown): Invitation {
  const body = obj(raw);
  return {
    id: str(body.id),
    familyId: str(body.familyId),
    familyName: str(body.familyName),
    invitedUserId: str(body.invitedUserId),
    role: oneOf(ROLES, body.role),
    status: oneOf(STATUSES, body.status),
  };
}

export function parseShared(raw: unknown): SharedTransaction {
  const body = obj(raw);
  const date = new Date(str(body.transactionDate));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date in response');
  return {
    id: str(body.id),
    sharedBy: str(body.sharedBy),
    amount: decimal(body.amount),
    currency: str(body.currency),
    categoryCode: str(body.categoryCode),
    merchant: optionalText(body.merchant),
    date,
  };
}

function parseBudget(raw: unknown): BudgetSummary {
  const body = obj(raw);
  if (body.state === 'AVAILABLE') {
    return {
      state: 'available',
      budgetId: str(body.budgetId),
      budgeted: decimal(body.budgetedAmount),
      spent: decimal(body.spentAmount),
      remaining: decimal(body.remainingAmount),
      percent: num(body.utilizationPercent),
      status: oneOf(USAGE, body.status),
    };
  }
  return body.reason === 'NO_ACTIVE_BUDGET' ? { state: 'none' } : { state: 'unavailable' };
}

export function parseDashboard(raw: unknown): FamilyDashboard {
  const body = obj(raw);
  const previous = body.previousMonth === null || body.previousMonth === undefined ? null : obj(body.previousMonth);
  return {
    month: str(obj(body.period).month),
    currency: str(body.currency),
    activeMembers: num(body.activeMemberCount),
    totalShared: decimal(body.totalSharedSpending),
    sharedCount: num(body.sharedTransactionCount),
    changePercent: previous ? optionalNumber(previous.changePercent) : null,
    budget: parseBudget(body.budget),
    categories: arr(body.spendingByCategory).map(parseCategoryShare),
    otherCurrencies: arr(body.excludedOtherCurrencies ?? []).map((item) => {
      const row = obj(item);
      return { currency: str(row.currency), count: num(row.transactionCount) };
    }),
  };
}

function parseCategoryShare(raw: unknown): CategoryShare {
  const body = obj(raw);
  return { categoryCode: str(body.categoryCode), total: decimal(body.total), sharePercent: num(body.sharePercent) };
}

export function parseUtilization(raw: unknown): BudgetUtilization {
  const body = obj(raw);
  return {
    currency: str(body.currency),
    totalLimit: decimal(body.totalLimit),
    totalSpent: decimal(body.totalSpent),
    percent: num(body.percentageUsed),
    status: oneOf(USAGE, body.usageStatus),
    lines: arr(body.categories).map((item) => {
      const row = obj(item);
      return {
        categoryCode: str(row.category),
        limit: decimal(row.limitAmount),
        spent: decimal(row.spentAmount),
        percent: num(row.percentageUsed),
        status: oneOf(USAGE, row.usageStatus),
      };
    }),
  };
}

// ---- families

export async function listFamilies(): Promise<Family[]> {
  const { data } = await api.get<unknown>(F);
  return arr(data).map(parseFamily);
}

export async function getFamily(id: string): Promise<Family> {
  const { data } = await api.get<unknown>(path(id));
  return parseFamily(data);
}

export type NewFamily = { name: string; description?: string; currency: string; timeZone?: string };

export async function createFamily(body: NewFamily): Promise<Family> {
  const { data } = await api.post<unknown>(F, body);
  return parseFamily(data);
}

export async function deleteFamily(id: string): Promise<void> {
  await api.delete(path(id));
}

// ---- members

export async function listMembers(familyId: string): Promise<Member[]> {
  const { data } = await api.get<unknown>(path(familyId, 'members'));
  return arr(data).map(parseMember);
}

export async function removeMember(familyId: string, memberId: string): Promise<void> {
  await api.delete(path(familyId, 'members', memberId));
}

export async function changeMemberRole(familyId: string, memberId: string, role: FamilyRole): Promise<void> {
  await api.patch(path(familyId, 'members', memberId, 'role'), { role });
}

export async function leaveFamily(familyId: string): Promise<void> {
  await api.post(path(familyId, 'leave'));
}

export async function transferOwnership(familyId: string, newOwnerMemberId: string): Promise<void> {
  await api.post(path(familyId, 'transfer-ownership'), { newOwnerMemberId });
}

// ---- invitations (by registered user id: the service has no e-mail invitations)

export async function listFamilyInvitations(familyId: string, status: InvitationStatus = 'PENDING'): Promise<Invitation[]> {
  const { data } = await api.get<unknown>(path(familyId, 'invitations'), { params: { status } });
  return arr(data).map(parseInvitation);
}

export async function listMyInvitations(status: InvitationStatus = 'PENDING'): Promise<Invitation[]> {
  const { data } = await api.get<unknown>(path('invitations', 'me'), { params: { status } });
  return arr(data).map(parseInvitation);
}

export async function createInvitation(familyId: string, invitedUserId: string, role: FamilyRole): Promise<void> {
  await api.post(path(familyId, 'invitations'), { invitedUserId, role });
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  await api.post(path('invitations', invitationId, 'accept'));
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await api.post(path('invitations', invitationId, 'decline'));
}

export async function revokeInvitation(familyId: string, invitationId: string): Promise<void> {
  await api.post(path(familyId, 'invitations', invitationId, 'revoke'));
}

// ---- the family's money

export async function getDashboard(familyId: string, month?: string): Promise<FamilyDashboard> {
  const { data } = await api.get<unknown>(path(familyId, 'dashboard'), { params: { month } });
  return parseDashboard(data);
}

export async function getBudgetUtilization(familyId: string, budgetId: string): Promise<BudgetUtilization> {
  const { data } = await api.get<unknown>(path(familyId, 'budgets', budgetId, 'utilization'));
  return parseUtilization(data);
}

// Only what members explicitly shared, newest first.
export async function listSharedTransactions(familyId: string, page = 0, size = 10): Promise<SharedPage> {
  const { data } = await api.get<unknown>(path(familyId, 'transactions'), { params: { page, size } });
  const body = obj(data);
  const current = num(body.page);
  return {
    items: arr(body.content).map(parseShared),
    page: current,
    hasMore: current + 1 < num(body.totalPages),
  };
}

// ---- opt-in sharing of one transaction

export async function shareTransaction(transactionId: string, familyId: string): Promise<void> {
  await api.post(`/api/transactions/${encodeURIComponent(transactionId)}/shares`, { familyId });
}

export async function unshareTransaction(transactionId: string, familyId: string): Promise<void> {
  await api.delete(`/api/transactions/${encodeURIComponent(transactionId)}/shares/${encodeURIComponent(familyId)}`);
}

// Which family-related problem an error is, so a screen can say something helpful. The server's own text is
// never shown.
export type FamilyProblem = 'network' | 'forbidden' | 'notFound' | 'conflict' | 'invalid' | 'rateLimited' | 'unavailable' | 'unknown';

export function familyProblem(error: unknown): FamilyProblem {
  if (!isAxiosError(error)) return 'unknown';
  const status = error.response?.status;
  if (status === undefined) return 'network';
  if (status === 400) return 'invalid';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimited';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  return 'unknown';
}
