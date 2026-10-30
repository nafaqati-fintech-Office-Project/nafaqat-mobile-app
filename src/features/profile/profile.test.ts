import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createPreferences,
  getProfile,
  getUserPreferences,
  parsePreferences,
  parseProfile,
  profileProblem,
  updatePreferences,
  updateProfile,
} from './profileApi';
import { cleanPhone, isPhone, newPreferences, profileBody, samePreferences, sameProfile } from './profileForm';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/api/client', () => ({ api: http }));

const failure = (status: number, data: unknown = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } });

const prefs = { currency: 'SAR', timezone: 'Asia/Riyadh', budgetCycleDay: 5 };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parsing', () => {
  it('reads a profile whose empty fields the service left out', () => {
    expect(parseProfile({ userId: 'u1', firstName: 'Sara', status: 'ACTIVE', nameProvisional: false })).toEqual({
      firstName: 'Sara',
      lastName: null,
      phone: null,
      nameProvisional: false,
    });
  });

  it('reads the preferences the screen edits', () => {
    expect(parsePreferences({ ...prefs, language: 'en', country: 'SA', theme: 'light' })).toEqual(prefs);
    expect(() => parsePreferences({ ...prefs, budgetCycleDay: null })).toThrow();
  });
});

describe('user service calls', () => {
  it('loads and saves the profile', async () => {
    http.get.mockResolvedValue({ data: { firstName: 'Sara', nameProvisional: true } });
    http.put.mockResolvedValue({ data: { firstName: 'Sara' } });
    expect((await getProfile()).nameProvisional).toBe(true);
    await updateProfile({ firstName: 'Sara', clearFields: ['phone'] });
    expect(http.get).toHaveBeenCalledWith('/api/users/me');
    expect(http.put).toHaveBeenCalledWith('/api/users/me', { firstName: 'Sara', clearFields: ['phone'] });
  });

  it('treats missing preferences as a new account, and other failures as failures', async () => {
    http.get.mockRejectedValueOnce(failure(404));
    expect(await getUserPreferences()).toBeNull();
    http.get.mockRejectedValueOnce(failure(500));
    await expect(getUserPreferences()).rejects.toThrow('HTTP 500');
  });

  it('updates saved preferences and creates them on the first save', async () => {
    http.put.mockResolvedValue({ data: prefs });
    http.post.mockResolvedValue({ data: prefs });
    await updatePreferences(prefs);
    await createPreferences(newPreferences(prefs, 'ar'));
    expect(http.put).toHaveBeenCalledWith('/api/users/me/preferences', prefs);
    expect(http.post).toHaveBeenCalledWith('/api/users/me/preferences', {
      ...prefs,
      language: 'ar',
      country: 'SA',
      theme: 'light',
    });
  });

  it('tells the phone refusals apart', () => {
    expect(profileProblem(failure(409, { message: 'The request conflicts with existing data' }))).toBe('phoneTaken');
    expect(profileProblem(failure(400, { message: 'Validation failed', fieldErrors: { phone: 'bad' } }))).toBe('phoneInvalid');
    expect(profileProblem(failure(409, { message: 'Cannot update a profile pending deletion' }))).toBe('unknown');
    expect(profileProblem(failure(400, { message: 'Validation failed', fieldErrors: { firstName: 'bad' } }))).toBe('unknown');
    expect(profileProblem(new Error('boom'))).toBe('unknown');
  });
});

describe('form rules', () => {
  it('cleans a typed phone and checks it as the service does', () => {
    expect(cleanPhone('+92 300-123 4567')).toBe('+923001234567');
    expect(cleanPhone('+٩٢٣٠٠١٢٣٤٥٦٧')).toBe('+923001234567');
    expect(isPhone('+923001234567')).toBe(true);
    expect(isPhone('03001234567')).toBe(false);
    expect(isPhone('+123')).toBe(false);
  });

  it('names emptied fields in clearFields, since a missing field keeps its value', () => {
    expect(profileBody({ firstName: 'Sara', lastName: 'Khan', phone: '+923001234567' })).toEqual({
      firstName: 'Sara',
      lastName: 'Khan',
      phone: '+923001234567',
    });
    expect(profileBody({ firstName: 'Sara', lastName: null, phone: null })).toEqual({
      firstName: 'Sara',
      clearFields: ['lastName', 'phone'],
    });
  });

  it('notices what changed', () => {
    const person = { firstName: 'Sara', lastName: null, phone: null };
    expect(sameProfile(person, { ...person })).toBe(true);
    expect(sameProfile(person, { ...person, phone: '+923001234567' })).toBe(false);
    expect(samePreferences(prefs, { ...prefs })).toBe(true);
    expect(samePreferences(prefs, { ...prefs, budgetCycleDay: 6 })).toBe(false);
    expect(samePreferences(null, prefs)).toBe(false);
  });

  it('falls back to a country for a currency the app does not know', () => {
    expect(newPreferences({ ...prefs, currency: 'USD' }, 'en').country).toBe('PK');
  });
});
