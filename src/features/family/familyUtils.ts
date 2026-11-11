import type { FamilyRole, Member } from './types';

// What the screens offer for the caller's role. The service stays the final authority.
export type Permissions = {
  invite: boolean;
  inviteAdmin: boolean; // an ADMIN invites members only
  remove: boolean;
  changeRole: boolean;
  transfer: boolean;
  delete: boolean;
  leave: boolean; // the owner must transfer ownership first
};

export function permissionsFor(role: FamilyRole | null): Permissions {
  const owner = role === 'OWNER';
  const manager = owner || role === 'ADMIN';
  return {
    invite: manager,
    inviteAdmin: owner,
    remove: manager,
    changeRole: owner,
    transfer: owner,
    delete: owner,
    leave: role !== null && !owner,
  };
}

// The owner removes admins and members, an admin removes members; nobody removes themselves here ("leave").
export function canRemoveMember(myRole: FamilyRole | null, member: Member, myUserId: string | null): boolean {
  if (member.userId === myUserId || member.role === 'OWNER') return false;
  if (myRole === 'OWNER') return true;
  return myRole === 'ADMIN' && member.role === 'MEMBER';
}

export const invitableRoles = (role: FamilyRole | null): FamilyRole[] =>
  role === 'OWNER' ? ['MEMBER', 'ADMIN'] : role === 'ADMIN' ? ['MEMBER'] : [];

// The service sends no names, so a member is "You" or a short tag of their id.
export const memberTag = (userId: string): string => `…${userId.slice(-4)}`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string): boolean => UUID.test(value.trim());

// "2026-10" for a date, in the caller's own calendar.
export const monthOf = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
