import { describe, expect, it } from 'vitest';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('reads .message from a plain Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('reads a Supabase PostgrestError (not an Error instance) and appends its code', () => {
    // Shape thrown by supabase-js on a failed insert — a plain object, not `instanceof Error`.
    const pgErr = {
      message: 'duplicate key value violates unique constraint "locker_sections_pkey"',
      details: 'Key (id)=(sec-001-042) already exists.',
      hint: null,
      code: '23505',
    };
    expect(errorMessage(pgErr)).toBe(
      'duplicate key value violates unique constraint "locker_sections_pkey" (23505)',
    );
  });

  it('reads a message-only object without a trailing code', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy' })).toBe(
      'new row violates row-level security policy',
    );
  });

  it('falls back to "unknown error" for shapes with no message', () => {
    expect(errorMessage(null)).toBe('unknown error');
    expect(errorMessage(undefined)).toBe('unknown error');
    expect(errorMessage({})).toBe('unknown error');
    expect(errorMessage('a string')).toBe('unknown error');
    expect(errorMessage(new Error(''))).toBe('unknown error');
  });
});
