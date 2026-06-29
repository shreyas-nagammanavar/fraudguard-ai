import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('fg_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await API.get('/me');
      setUser(data.user);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user:', err.response?.status, err.response?.data);
      localStorage.removeItem('fg_token');
      localStorage.removeItem('fg_user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password, remember) => {
    const { data } = await API.post('/login', { email, password, remember });
    console.log('Login response:', { token: data.token ? 'received' : 'missing', user: data.user });
    
    // Save to localStorage
    localStorage.setItem('fg_token', data.token);
    localStorage.setItem('fg_user', JSON.stringify(data.user));
    
    // Verify it was saved
    console.log('Saved token:', localStorage.getItem('fg_token'));
    console.log('Saved user:', localStorage.getItem('fg_user'));
    
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const { data } = await API.post('/register', { username, email, password });
    localStorage.setItem('fg_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await API.post('/logout'); } catch {}
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
