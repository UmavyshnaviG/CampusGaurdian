import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cg360_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // On mount, attempt to restore the session from a stored token
  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data.user);
      } catch {
        // Token invalid or expired – clean up silently
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data.data;
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = { user, token, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
