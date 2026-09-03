/**
 * Enterprise Security Authentication Service & User Hash Table
 */

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  feedback: string[];
}

export interface GeoLocationSignal {
  lastKnownLocation: string;
  currentLocation: string;
  timeDifferenceMinutes: number;
  isImpossibleTravel: boolean;
}

export interface UserHashRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  salt: string;
  expectedPassword: string;
}

/**
 * Hash Table storing authorized user accounts.
 * Authorized accounts:
 * 1. nsrivatsa084@gmail.com -> password: nwis@098
 * 2. oilengineer@gmail.com  -> password: oil@098
 */
export const authorizedUserHashTable: Map<string, UserHashRecord> = new Map([
  [
    'nsrivatsa084@gmail.com',
    {
      id: 'usr-nwis-102',
      email: 'nsrivatsa084@gmail.com',
      name: 'N Srivatsa',
      role: 'Lead Drilling Engineer',
      salt: 'SALT_nsrivatsa084@gmail.com',
      expectedPassword: 'nwis@098',
    },
  ],
  [
    'oilengineer@gmail.com',
    {
      id: 'usr-oil-101',
      email: 'oilengineer@gmail.com',
      name: 'Rituraj Baruah',
      role: 'Senior Drilling Engineer',
      salt: 'SALT_oilengineer@gmail.com',
      expectedPassword: 'oil@098',
    },
  ],
]);

/**
 * Real Cryptographic Password Hashing & Salting using Web Crypto API.
 * Combines password + unique user salt + server pepper key.
 */
export async function hashPasswordWithSalt(
  password: string,
  userSalt: string = 'SALT_nsrivatsa084@gmail.com'
): Promise<string> {
  const pepper = 'SERVER_SECRET_PEPPER_KEY_3091';
  const textToHash = `${userSalt}:${password}:${pepper}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(textToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time string comparison to prevent side-channel timing attacks
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

import apiClient from '../api/client';

export async function loginUser(emailInput: string, passwordInput: string): Promise<{ access_token: string, user: any }> {
  // FastAPI expects form-data for OAuth2PasswordRequestForm (x-www-form-urlencoded)
  const params = new URLSearchParams();
  params.append('username', emailInput);
  params.append('password', passwordInput);
  
  const tokenResponse = await apiClient.post('/api/v1/auth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  const accessToken = tokenResponse.data.access_token;
  
  // Set temporary header just to fetch profile
  const originalHeaders = apiClient.defaults.headers.common['Authorization'];
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  
  const profileResponse = await apiClient.get('/api/v1/auth/me');
  
  // Revert back so interceptor handles it naturally using localStorage
  apiClient.defaults.headers.common['Authorization'] = originalHeaders;

  return { access_token: accessToken, user: profileResponse.data };
}

export async function registerUser(data: any): Promise<any> {
  const response = await apiClient.post('/api/v1/auth/register', data);
  return response.data;
}

export async function authenticateAgainstHashTable(
  emailInput: string,
  passwordInput: string
): Promise<any | null> {
  try {
    const response = await loginUser(emailInput, passwordInput);
    return {
      ...response.user,
      token: response.access_token,
      email: emailInput,
      name: response.user.username || emailInput
    };
  } catch (error) {
    return null;
  }
}


/**
 * Verifies if a Google OAuth user email exists in the authorized Hash Table database.
 * Strictly grants access ONLY if the email exists in authorizedUserHashTable.
 */
export function authenticateGoogleUserInHashTable(googleEmail: string): UserHashRecord | null {
  const normalizedEmail = googleEmail.trim().toLowerCase();
  return authorizedUserHashTable.get(normalizedEmail) || null;
}

// Evaluate Password Strength based on entropy, length & character diversity
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters required');

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add a number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Add special character (!@#$)');

  const scoreMap: Record<number, PasswordStrengthResult['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very Strong',
    5: 'Very Strong',
  };

  return {
    score: Math.min(score, 4),
    label: scoreMap[score] || 'Weak',
    feedback,
  };
}

// Rate Limiting tracker
class RateLimiter {
  private attempts: Map<string, { count: number; lockUntil: number }> = new Map();

  public recordFailedAttempt(key: string): { locked: boolean; lockSeconds: number } {
    const now = Date.now();
    const current = this.attempts.get(key) || { count: 0, lockUntil: 0 };

    if (current.lockUntil > now) {
      return { locked: true, lockSeconds: Math.ceil((current.lockUntil - now) / 1000) };
    }

    const newCount = current.count + 1;
    let lockDuration = 0;

    if (newCount >= 3) {
      // Exponential backoff
      lockDuration = Math.pow(2, newCount - 3) * 15 * 1000; // 15s, 30s, 60s...
    }

    this.attempts.set(key, {
      count: newCount,
      lockUntil: now + lockDuration,
    });

    return {
      locked: lockDuration > 0,
      lockSeconds: Math.ceil(lockDuration / 1000),
    };
  }

  public isLocked(key: string): { locked: boolean; lockSeconds: number } {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (current && current.lockUntil > now) {
      return { locked: true, lockSeconds: Math.ceil((current.lockUntil - now) / 1000) };
    }
    return { locked: false, lockSeconds: 0 };
  }

  public reset(key: string) {
    this.attempts.delete(key);
  }
}

export const authRateLimiter = new RateLimiter();

// Simulated Geo-velocity Impossible Travel Signal Check
export function checkGeoVelocity(currentCity: string): GeoLocationSignal {
  const lastKnown = 'Bengaluru, India';
  const timeDiff = 20; // 20 minutes ago
  const isImpossible = currentCity.toLowerCase().includes('new york') || currentCity.toLowerCase().includes('london');

  return {
    lastKnownLocation: lastKnown,
    currentLocation: currentCity,
    timeDifferenceMinutes: timeDiff,
    isImpossibleTravel: isImpossible,
  };
}

// Generate single-use password reset token with 15-minute expiration
export function generateSingleUseResetToken(): { token: string; expiresAt: string } {
  const randomBytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString();
  return {
    token: `reset_${randomBytes}`,
    expiresAt,
  };
}
