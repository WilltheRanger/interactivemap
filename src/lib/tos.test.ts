import { afterEach, describe, expect, it } from 'vitest';
import { acceptTos, getTosAccepted, subscribeTos, TOS_ACCEPTED_KEY } from './tos';

describe('tos store', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('persists acceptance and notifies subscribers', () => {
    let calls = 0;
    const unsubscribe = subscribeTos(() => {
      calls += 1;
    });

    acceptTos();
    expect(getTosAccepted()).toBe(true);
    expect(localStorage.getItem(TOS_ACCEPTED_KEY)).toBe('1');
    expect(calls).toBe(1);

    acceptTos(); // already accepted → no extra notify
    expect(calls).toBe(1);
    unsubscribe();
  });
});
