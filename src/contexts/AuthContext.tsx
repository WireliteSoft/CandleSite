import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiGet, apiPost, authToken, ApiUser, Profile } from '../lib/api';

interface AuthContextType {
  user: ApiUser | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

interface AuthResponse {
  token: string;
  user: ApiUser;
  profile: Profile;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = authToken.get();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet<{ user: ApiUser; profile: Profile }>('/api/auth/me');
        setUser(data.user);
        setProfile(data.profile);
      } catch {
        authToken.clear();
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await apiPost<AuthResponse>('/api/auth/signup', {
        email,
        password,
        fullName,
      });
      authToken.set(data.token);
      setUser(data.user);
      setProfile(data.profile);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiPost<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      authToken.set(data.token);
      setUser(data.user);
      setProfile(data.profile);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    authToken.clear();
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
