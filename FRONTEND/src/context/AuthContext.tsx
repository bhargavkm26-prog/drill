import React, { createContext, useContext, useState } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string;
  trustedDevice: boolean;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'MFA_CHALLENGE' | 'PASSKEY_AUTH' | 'PASSWORD_RESET';
  location: string;
  ip: string;
  device: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  auditLogs: SecurityAuditEntry[];
  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  addAuditLog: (entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('nwis_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('nwis_access_token');
  });

  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3600000).toLocaleString(),
      action: 'LOGIN_SUCCESS',
      location: 'Assam, India',
      ip: '103.48.198.12',
      device: 'Windows 11 / Chrome 124',
      status: 'SUCCESS',
    },
  ]);

  const login = (userData: UserProfile, token: string) => {
    setUser(userData);
    setAccessToken(token);
    localStorage.setItem('nwis_user_session', JSON.stringify(userData));
    localStorage.setItem('nwis_access_token', token);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('nwis_user_session');
    localStorage.removeItem('nwis_access_token');
  };

  const addAuditLog = (entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>) => {
    const newLog: SecurityAuditEntry = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!accessToken,
        accessToken,
        auditLogs,
        login,
        logout,
        addAuditLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
