import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cg360_token';

// ---------------------------------------------------------------------------
// Mock users — used when backend is not running
// ---------------------------------------------------------------------------
const MOCK_USERS = {
  'admin@campus.edu': {
    _id: 'mock-admin-001',
    name: 'Admin User',
    email: 'admin@campus.edu',
    role: 'admin',
    department: 'Administration',
    designation: 'Campus Administrator',
  },
  'student@campus.edu': {
    _id: 'mock-student-001',
    name: 'Rahul Kumar',
    email: 'student@campus.edu',
    role: 'student',
    department: 'Computer Science',
    year: 2,
  },
  'faculty@campus.edu': {
    _id: 'mock-faculty-001',
    name: 'Dr. Priya Sharma',
    email: 'faculty@campus.edu',
    role: 'faculty',
    department: 'Electronics',
    designation: 'Assistant Professor',
  },
  'officer@campus.edu': {
    _id: 'mock-officer-001',
    name: 'Sensitive Officer',
    email: 'officer@campus.edu',
    role: 'sensitive_officer',
    department: 'Student Welfare',
    designation: 'Welfare Officer',
  },
};
const MOCK_PASSWORD = 'demo123';

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
      // Mock token — restore from localStorage without hitting backend
      if (token.startsWith('mock-token-')) {
        const saved = localStorage.getItem('cg360_mock_user');
        if (saved) {
          try { setUser(JSON.parse(saved)); } catch {}
        }
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('cg360_mock_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    try {
      // Try real backend first
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data.data;
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(newUser);
      return newUser;
    } catch (err) {
      // Backend not running — try mock login
      const mockUser = MOCK_USERS[email.toLowerCase()];
      if (mockUser && password === MOCK_PASSWORD) {
        const mockToken = 'mock-token-' + mockUser.role;
        localStorage.setItem(TOKEN_KEY, mockToken);
        localStorage.setItem('cg360_mock_user', JSON.stringify(mockUser));
        setToken(mockToken);
        setUser(mockUser);
        return mockUser;
      }
      // Neither worked — re-throw
      throw err;
    }
  }, []);

  const register = useCallback(async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('cg360_mock_user');
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
