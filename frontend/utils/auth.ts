'use client';

// Token key in localStorage
const TOKEN_KEY = 'eventflow_token';
const USER_ID_KEY = 'eventflow_user_id';

/**
 * Set authentication token and user ID in localStorage
 */
export const setAuth = (token: string, userId: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, userId);
    }
};

/**
 * Get authentication token from localStorage
 */
export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
};

/**
 * Get user ID from localStorage
 */
export const getUserId = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(USER_ID_KEY);
    }
    return null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return getToken() !== null;
};

/**
 * Clear authentication data from localStorage
 */
export const logout = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
    }
};
