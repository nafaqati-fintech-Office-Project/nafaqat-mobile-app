import { describe, expect, it } from 'vitest';

import { validateEmail, validateRegister, type RegisterValues } from './validators';

const valid: RegisterValues = {
  firstName: 'Ali',
  lastName: 'Khan',
  username: 'ali.khan_1',
  email: 'ali@example.com',
  password: 'Passw0rd!',
  confirmPassword: 'Passw0rd!',
};

describe('validateRegister', () => {
  it('accepts a valid form', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('allows an empty last name but not an empty first name', () => {
    expect(validateRegister({ ...valid, lastName: '' })).toEqual({});
    expect(validateRegister({ ...valid, firstName: '' }).firstName).toBe('validation.firstNameRequired');
  });

  it('rejects names over 100 characters', () => {
    const long = 'a'.repeat(101);
    expect(validateRegister({ ...valid, firstName: long }).firstName).toBe('validation.nameTooLong');
    expect(validateRegister({ ...valid, lastName: long }).lastName).toBe('validation.nameTooLong');
  });

  it('applies the 3-50 character username pattern', () => {
    expect(validateRegister({ ...valid, username: 'ab' }).username).toBe('validation.usernameInvalid');
    expect(validateRegister({ ...valid, username: 'has space' }).username).toBe('validation.usernameInvalid');
    expect(validateRegister({ ...valid, username: 'a'.repeat(51) }).username).toBe('validation.usernameInvalid');
    expect(validateRegister({ ...valid, username: 'a-b.c_d' }).username).toBeUndefined();
  });

  it('requires at least 8 characters and at most 72 bytes in the password', () => {
    expect(validateRegister({ ...valid, password: 'short', confirmPassword: 'short' }).password).toBe(
      'validation.passwordTooShort',
    );
    // 40 two-byte characters = 80 bytes
    const heavy = 'é'.repeat(40);
    expect(validateRegister({ ...valid, password: heavy, confirmPassword: heavy }).password).toBe(
      'validation.passwordTooLongBytes',
    );
    const empty = validateRegister({ ...valid, password: '', confirmPassword: '' });
    expect(empty.password).toBe('validation.passwordRequired');
  });

  it('requires the confirmation to match', () => {
    expect(validateRegister({ ...valid, confirmPassword: 'Different1' }).confirmPassword).toBe(
      'validation.passwordMismatch',
    );
  });
});

describe('validateEmail', () => {
  it('flags empty, malformed and over-long emails', () => {
    expect(validateEmail('')).toBe('validation.emailRequired');
    expect(validateEmail('not-an-email')).toBe('validation.emailInvalid');
    expect(validateEmail('a@b')).toBe('validation.emailInvalid');
    expect(validateEmail(`${'a'.repeat(250)}@x.com`)).toBe('validation.emailTooLong');
    expect(validateEmail('ali@example.com')).toBeNull();
  });
});
