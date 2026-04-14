import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { extractError } from './client';

function makeAxiosError(data: unknown, message = 'Request failed'): AxiosError {
  const err = new AxiosError(message);
  err.response = {
    data,
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() } as never,
  };
  return err;
}

describe('extractError', () => {
  it('handles new envelope: { error: { code, message, requestId } } and appends ref', () => {
    const err = makeAxiosError({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email',
        requestId: 'abcdef1234567890',
      },
    });
    expect(extractError(err)).toBe('Invalid email (ref: abcdef12)');
  });

  it('handles new envelope without requestId (no ref appended)', () => {
    const err = makeAxiosError({
      error: { code: 'NOT_FOUND', message: 'Order not found' },
    });
    expect(extractError(err)).toBe('Order not found');
  });

  it('handles legacy envelope: { error: "message" }', () => {
    const err = makeAxiosError({ error: 'Something broke' });
    expect(extractError(err)).toBe('Something broke');
  });

  it('falls back to err.message for axios errors with no body', () => {
    const err = makeAxiosError(undefined, 'Network Error');
    expect(extractError(err)).toBe('Network Error');
  });

  it('falls back to provided fallback for non-axios errors', () => {
    expect(extractError('not an error', 'oops')).toBe('oops');
  });

  it('uses Error.message for plain Error instances', () => {
    expect(extractError(new Error('plain'))).toBe('plain');
  });
});
