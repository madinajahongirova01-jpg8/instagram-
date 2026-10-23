import { PASSWORD_REGEX, USERNAME_REGEX } from '@insta/shared';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ValidationKey = 'required' | 'email' | 'username' | 'password' | 'passwordsMismatch' | 'agree' | 'url';

export function validateEmail(value: string): ValidationKey | null {
  if (!value.trim()) return 'required';
  return EMAIL_REGEX.test(value.trim()) ? null : 'email';
}

export function validateUsername(value: string): ValidationKey | null {
  if (!value.trim()) return 'required';
  return USERNAME_REGEX.test(value.trim().toLowerCase()) ? null : 'username';
}

export function validateNewPassword(value: string): ValidationKey | null {
  if (!value) return 'required';
  return PASSWORD_REGEX.test(value) ? null : 'password';
}

export function validateRequired(value: string): ValidationKey | null {
  return value.trim() ? null : 'required';
}

export function validateConfirmation(password: string, confirmation: string): ValidationKey | null {
  if (!confirmation) return 'required';
  return password === confirmation ? null : 'passwordsMismatch';
}

export function validateUrl(value: string): ValidationKey | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'url';
  } catch {
    return 'url';
  }
}

export function hasErrors(errors: Record<string, ValidationKey | null>): boolean {
  return Object.values(errors).some((value) => value !== null);
}
