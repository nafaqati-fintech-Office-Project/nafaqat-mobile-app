import { isAxiosError } from 'axios';

import type { Contribution, Goal, GoalInput, GoalStatus } from './types';
import { api } from '@/api/client';
import { arr, decimal, localDate, obj, str } from '@/api/parse';

const BASE = '/api/goals';
const STATUSES: GoalStatus[] = ['ACTIVE', 'COMPLETED', 'CANCELLED'];

const goalPath = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

const optionalText = (value: unknown) => (value === null || value === undefined ? null : str(value));
const optionalDate = (value: unknown) => (value === null || value === undefined ? null : localDate(value));

// The service sends UTC with no zone and up to 6 decimals ("2026-10-14T01:00:00.5"); Date would read it as local time.
function utcDate(value: unknown): Date {
  const match = /^(.+T\d{2}:\d{2})(?::(\d{2})(?:\.(\d+))?)?$/.exec(str(value));
  if (!match) throw new Error('Invalid date in response');
  const date = new Date(`${match[1]}:${match[2] ?? '00'}.${(match[3] ?? '').slice(0, 3).padEnd(3, '0')}Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date in response');
  return date;
}

function statusOf(value: unknown): GoalStatus {
  const found = STATUSES.find((status) => status === value);
  if (!found) throw new Error('Unexpected value in response');
  return found;
}

export function parseGoal(raw: unknown): Goal {
  const body = obj(raw);
  return {
    id: str(body.id),
    name: str(body.name),
    description: optionalText(body.description),
    targetAmount: decimal(body.targetAmount),
    savedAmount: decimal(body.savedAmount),
    currency: str(body.currency),
    targetDate: optionalDate(body.targetDate),
    status: statusOf(body.status),
    createdAt: utcDate(body.createdAt),
  };
}

export function parseContribution(raw: unknown): Contribution {
  const body = obj(raw);
  return {
    id: str(body.id),
    goalId: str(body.goalId),
    amount: decimal(body.amount),
    note: optionalText(body.note),
    createdAt: utcDate(body.createdAt),
  };
}

// The service expects amounts as JSON numbers; readAmount's limit of 12 whole digits keeps them exact.
const goalBody = (input: GoalInput) => ({ ...input, targetAmount: Number(input.targetAmount) });

// Newest first, every status (deleted goals are never listed).
export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get<unknown>(BASE);
  return arr(data).map(parseGoal);
}

export async function getGoal(id: string): Promise<Goal> {
  const { data } = await api.get<unknown>(goalPath(id));
  return parseGoal(data);
}

// The goal with its contributions, newest first.
export async function getGoalWithHistory(id: string): Promise<{ goal: Goal; contributions: Contribution[] }> {
  const [goal, history] = await Promise.all([getGoal(id), api.get<unknown>(`${goalPath(id)}/contributions`)]);
  return { goal, contributions: arr(history.data).map(parseContribution) };
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const { data } = await api.post<unknown>(BASE, goalBody(input));
  return parseGoal(data);
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const { data } = await api.put<unknown>(goalPath(id), goalBody(input));
  return parseGoal(data);
}

// Adds to the saved amount. Reaching the target changes nothing by itself: the user completes the goal.
// Sending the same requestId again never adds it twice, so a request that timed out can be repeated.
export async function addContribution(id: string, amount: string, note: string | null, requestId: string): Promise<Contribution> {
  const { data } = await api.post<unknown>(`${goalPath(id)}/contributions`, { amount: Number(amount), note, requestId });
  return parseContribution(data);
}

export async function changeStatus(id: string, action: 'complete' | 'reopen' | 'cancel'): Promise<Goal> {
  const { data } = await api.post<unknown>(`${goalPath(id)}/${action}`);
  return parseGoal(data);
}

// Allowed in any status; the goal and its history disappear from every list.
export async function deleteGoal(id: string): Promise<void> {
  await api.delete(goalPath(id));
}

export type GoalProblem = 'notFound' | 'notAllowed' | 'belowSaved' | 'unknown';

// What went wrong, from the service's answer (ErrorResponse: status, message, details).
export function goalProblem(error: unknown): GoalProblem {
  if (!isAxiosError(error)) return 'unknown';
  const status = error.response?.status;
  const data: unknown = error.response?.data;
  const message =
    typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string' ? data.message : '';
  if (status === 404) return 'notFound';
  // 409: the goal's status does not allow it, or it changed elsewhere meanwhile.
  if (status === 409) return 'notAllowed';
  if (status === 400 && message.includes('lower than the amount already saved')) return 'belowSaved';
  if (status === 400 && message.includes('currency cannot be changed')) return 'notAllowed';
  return 'unknown';
}
