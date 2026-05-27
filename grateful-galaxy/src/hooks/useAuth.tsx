// hooks/useAuth.tsx

import { useState, useEffect, createContext, useContext } from "react";
import type { AuthUser } from "@/lib/auth";
import { getCachedUser, getUser, logout as authLogout } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true); // true เสมอตอนเริ่ม

  useEffect(() => {
    // 1. โหลด cache ก่อน — ไม่ต้องรอ network
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false); // ← หยุด spinner ทันที
    }

    // 2. Verify กับ backend ใน background
    getUser().then((fresh) => {
      setUser(fresh);
      setLoading(false); // ครอบกรณีที่ไม่มี cache ด้วย
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout: authLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}