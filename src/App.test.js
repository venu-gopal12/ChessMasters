// Purpose: Regression tests for frontend session state behavior.
import { beforeEach, describe, expect, test } from 'vitest';
import userReducer, { clearUser, setUser } from './redux/userSlice';

describe('user session state', () => {
  beforeEach(() => localStorage.clear());

  test('stores and clears authenticated user state', () => {
    const signedIn = userReducer(
      { userId: null, role: null },
      setUser({ userId: 'player-1', role: 'player' })
    );
    expect(signedIn).toEqual({ userId: 'player-1', role: 'player' });
    expect(localStorage.getItem('userId')).toBe('player-1');

    expect(userReducer(signedIn, clearUser())).toEqual({
      userId: null,
      role: null,
    });
  });
});
