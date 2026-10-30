import { isAxiosError } from 'axios';

import { api } from '@/api/client';
import { num, obj, str } from '@/api/parse';

const PROFILE = '/api/users/me';
const PREFERENCES = `${PROFILE}/preferences`;

export type Profile = {
  firstName: string;
  lastName: string | null;
  phone: string | null;
  // True while firstName is only a placeholder (the username).
  nameProvisional: boolean;
};

// What the screen edits; the service stores more (language, country, theme) and PUT leaves those as they are.
export type Preferences = { currency: string; timezone: string; budgetCycleDay: number };

// The extra fields the first save needs; POST refuses a body without them.
export type NewPreferences = Preferences & { language: string; country: string; theme: string };

export type ProfileUpdate = { firstName: string; lastName?: string; phone?: string; clearFields?: string[] };

// The service leaves empty fields out of its answer.
const optionalText = (value: unknown) => (value === null || value === undefined ? null : str(value));

export function parseProfile(raw: unknown): Profile {
  const body = obj(raw);
  return {
    firstName: str(body.firstName),
    lastName: optionalText(body.lastName),
    phone: optionalText(body.phone),
    nameProvisional: body.nameProvisional === true,
  };
}

export function parsePreferences(raw: unknown): Preferences {
  const body = obj(raw);
  return { currency: str(body.currency), timezone: str(body.timezone), budgetCycleDay: num(body.budgetCycleDay) };
}

// Creates a placeholder profile on the first call, so it never answers 404.
export async function getProfile(): Promise<Profile> {
  const { data } = await api.get<unknown>(PROFILE);
  return parseProfile(data);
}

export async function updateProfile(body: ProfileUpdate): Promise<Profile> {
  const { data } = await api.put<unknown>(PROFILE, body);
  return parseProfile(data);
}

// null: not saved yet (normal for a new account).
export async function getUserPreferences(): Promise<Preferences | null> {
  try {
    const { data } = await api.get<unknown>(PREFERENCES);
    return parsePreferences(data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function updatePreferences(body: Preferences): Promise<Preferences> {
  const { data } = await api.put<unknown>(PREFERENCES, body);
  return parsePreferences(data);
}

export async function createPreferences(body: NewPreferences): Promise<Preferences> {
  const { data } = await api.post<unknown>(PREFERENCES, body);
  return parsePreferences(data);
}

export type ProfileProblem = 'phoneTaken' | 'phoneInvalid' | 'unknown';

// What went wrong, from the service's answer (message, fieldErrors).
export function profileProblem(error: unknown): ProfileProblem {
  if (!isAxiosError(error)) return 'unknown';
  const data: unknown = error.response?.data;
  const body = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  // The phone is the only unique field a profile update can change.
  if (error.response?.status === 409 && body.message === 'The request conflicts with existing data') return 'phoneTaken';
  if (error.response?.status === 400 && typeof body.fieldErrors === 'object' && body.fieldErrors !== null && 'phone' in body.fieldErrors) {
    return 'phoneInvalid';
  }
  return 'unknown';
}
