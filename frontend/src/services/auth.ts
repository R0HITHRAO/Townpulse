/**
 * TownPulse Auth State Helpers
 */

import { User } from './api';

export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem('townpulse_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User): void {
  localStorage.setItem('townpulse_user', JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('townpulse_access_token');
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}

export function isBusinessOwner(): boolean {
  const user = getCurrentUser();
  return user?.role === 'business_owner' || user?.role === 'admin';
}
