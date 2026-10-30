import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addContribution,
  changeStatus,
  createGoal,
  deleteGoal,
  getGoal,
  getGoalWithHistory,
  goalProblem,
  listGoals,
  parseContribution,
  parseGoal,
  updateGoal,
} from './goalsApi';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));

// A GoalResponse as the goal service sends it.
const raw = (overrides: Record<string, unknown> = {}) => ({
  id: 'g1',
  name: 'Dubai Vacation',
  description: 'Family trip',
  targetAmount: 7500.5,
  savedAmount: 4650,
  currency: 'SAR',
  targetDate: '2027-08-16',
  status: 'ACTIVE',
  remainingAmount: 2850.5,
  progressPercentage: 61.99,
  createdAt: '2026-10-14T01:00:00.123456',
  updatedAt: '2026-10-14T01:00:00.123456',
  ...overrides,
});

// A ContributionResponse as the goal service sends it.
const rawContribution = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  goalId: 'g1',
  amount: 125.5,
  note: 'salary',
  requestId: 'r1',
  createdAt: '2026-10-14T01:00:00.5',
  ...overrides,
});

const input = { name: 'Hajj', description: null, targetAmount: '20000.50', currency: 'SAR', targetDate: '2028-05-01' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parseGoal', () => {
  it('reads what the screens show', () => {
    expect(parseGoal(raw())).toEqual({
      id: 'g1',
      name: 'Dubai Vacation',
      description: 'Family trip',
      targetAmount: '7500.5',
      savedAmount: '4650',
      currency: 'SAR',
      targetDate: new Date(2027, 7, 16),
      status: 'ACTIVE',
      createdAt: new Date('2026-10-14T01:00:00.123Z'),
    });
  });

  it('accepts a goal with no description or date', () => {
    expect(parseGoal(raw({ description: null, targetDate: null }))).toMatchObject({ description: null, targetDate: null });
  });

  it('reads the timestamps as UTC, however many decimals they have', () => {
    expect(parseGoal(raw({ createdAt: '2026-10-14T01:00:00' })).createdAt).toEqual(new Date('2026-10-14T01:00:00.000Z'));
    expect(parseGoal(raw({ createdAt: '2026-10-14T01:00' })).createdAt).toEqual(new Date('2026-10-14T01:00:00.000Z'));
    expect(parseContribution(rawContribution()).createdAt).toEqual(new Date('2026-10-14T01:00:00.500Z'));
  });

  it('refuses a shape the app does not expect', () => {
    expect(() => parseGoal(raw({ status: 'PAUSED' }))).toThrow();
    expect(() => parseGoal(raw({ createdAt: 'yesterday' }))).toThrow();
    expect(() => parseGoal(raw({ savedAmount: null }))).toThrow();
  });
});

describe('goal service calls', () => {
  it('lists the goals in the order the service sends them', async () => {
    http.get.mockResolvedValue({ data: [raw({ id: 'new' }), raw({ id: 'old' })] });
    expect((await listGoals()).map((g) => g.id)).toEqual(['new', 'old']);
    expect(http.get).toHaveBeenCalledWith('/api/goals');
  });

  it('loads a goal on its own, or with its history', async () => {
    http.get.mockImplementation(async (url: string) =>
      url.endsWith('/contributions') ? { data: [rawContribution()] } : { data: raw() },
    );
    expect((await getGoal('g/1')).id).toBe('g1');
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/api/goals/g%2F1');

    const { goal, contributions } = await getGoalWithHistory('g1');
    expect(goal.name).toBe('Dubai Vacation');
    expect(contributions).toEqual([
      { id: 'c1', goalId: 'g1', amount: '125.5', note: 'salary', createdAt: new Date('2026-10-14T01:00:00.500Z') },
    ]);
  });

  it('sends amounts as numbers when creating and editing', async () => {
    http.post.mockResolvedValue({ data: raw() });
    http.put.mockResolvedValue({ data: raw() });
    await createGoal(input);
    await updateGoal('g1', input);
    const body = { ...input, targetAmount: 20000.5 };
    expect(http.post).toHaveBeenCalledWith('/api/goals', body);
    expect(http.put).toHaveBeenCalledWith('/api/goals/g1', body);
  });

  it('records a contribution with its requestId', async () => {
    http.post.mockResolvedValue({ data: rawContribution() });
    expect(await addContribution('g1', '125.50', null, 'r1')).toMatchObject({ amount: '125.5' });
    expect(http.post).toHaveBeenCalledWith('/api/goals/g1/contributions', { amount: 125.5, note: null, requestId: 'r1' });
  });

  it('changes the status and deletes through the service', async () => {
    http.post.mockResolvedValue({ data: raw({ status: 'COMPLETED' }) });
    http.delete.mockResolvedValue({ data: '' });
    expect((await changeStatus('g1', 'complete')).status).toBe('COMPLETED');
    await changeStatus('g1', 'reopen');
    await changeStatus('g1', 'cancel');
    await deleteGoal('g1');
    expect(http.post.mock.calls.map(([url]) => url)).toEqual([
      '/api/goals/g1/complete',
      '/api/goals/g1/reopen',
      '/api/goals/g1/cancel',
    ]);
    expect(http.delete).toHaveBeenCalledWith('/api/goals/g1');
  });
});

describe('goalProblem', () => {
  const refused = (status: number, message: string) =>
    Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data: { message } } });

  it('tells the refusals apart', () => {
    expect(goalProblem(refused(404, 'Goal not found'))).toBe('notFound');
    expect(goalProblem(refused(409, 'Only ACTIVE goals can be edited (current status: CANCELLED)'))).toBe('notAllowed');
    expect(goalProblem(refused(409, 'The goal has not reached its target amount yet'))).toBe('notAllowed');
    expect(goalProblem(refused(400, 'targetAmount cannot be lower than the amount already saved'))).toBe('belowSaved');
    expect(goalProblem(refused(400, 'currency cannot be changed once money has been saved'))).toBe('notAllowed');
    expect(goalProblem(refused(400, 'Validation failed'))).toBe('unknown');
    expect(goalProblem(refused(503, ''))).toBe('unknown');
    expect(goalProblem(Object.assign(new Error('Network Error'), { isAxiosError: true }))).toBe('unknown');
    expect(goalProblem(new Error('boom'))).toBe('unknown');
  });
});
