import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './AuthPages';

describe('authentication validation', () => {
  it('rejects an invalid login email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'secret' }).success).toBe(false);
  });

  it('requires matching strong registration passwords and activation key', () => {
    expect(registerSchema.safeParse({
      displayName: 'Planner',
      email: 'planner@example.com',
      password: 'password',
      confirmPassword: 'different',
      activationKey: 'SMART-2026',
    }).success).toBe(false);

    // Missing activation key
    expect(registerSchema.safeParse({
      displayName: 'Planner',
      email: 'planner@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      activationKey: '',
    }).success).toBe(false);
  });

  it('accepts a valid registration form with activation key', () => {
    expect(registerSchema.safeParse({
      displayName: 'Planner',
      email: 'planner@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      activationKey: 'SMART-DEPLOY-2026',
    }).success).toBe(true);
  });
});
