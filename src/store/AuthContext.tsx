import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

interface User {
  id: number;
  email: string;
  name: string;
  isVerified: boolean;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, jwt: string, refreshToken: string) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  isInitialized: boolean;
}

interface DecodedToken {
  exp: number;
}

const API_URL = (import.meta.env.VITE_API_URL || "https://api.talesandtreasures.com.ng").replace(
  /\/$/,
  ""
);

const AuthContext = createContext<AuthContextType>(null!);

function clearStoredAuth() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("authUser");
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("authToken");
      const storedRefreshToken = localStorage.getItem("refreshToken");
      const storedUser = localStorage.getItem("authUser");

      if (!storedUser) {
        clearStoredAuth();
        setIsInitialized(true);
        return;
      }

      try {
        const parsedUser: User = JSON.parse(storedUser);
        const now = Date.now() / 1000;

        if (storedToken) {
          const decoded = jwtDecode<DecodedToken>(storedToken);
          if (decoded.exp > now) {
            setToken(storedToken);
            setUser(parsedUser);
            setIsInitialized(true);
            return;
          }
        }

        if (storedRefreshToken) {
          const refreshResponse = await axios.post(
            `${API_URL}/auth/refresh`,
            { refreshToken: storedRefreshToken },
            {
              headers: {
                Authorization: `Bearer ${storedRefreshToken}`,
              },
            },
          );

          const nextAccessToken = refreshResponse.data?.accessToken as string | undefined;
          if (nextAccessToken) {
            localStorage.setItem("authToken", nextAccessToken);
            setToken(nextAccessToken);
            setUser(parsedUser);
            setIsInitialized(true);
            return;
          }
        }

        clearStoredAuth();
      } catch (error) {
        console.error("Failed to restore auth session:", error);
        clearStoredAuth();
      } finally {
        setIsInitialized(true);
      }
    };

    void initializeAuth();
  }, []);

  const login = (userData: User, jwt: string, refreshToken: string) => {
    localStorage.setItem("authToken", jwt);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("authUser", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      localStorage.setItem("authUser", JSON.stringify(merged));
      return merged;
    });
  };

  const value = {
    user,
    token,
    login,
    updateUser,
    logout,
    isInitialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
