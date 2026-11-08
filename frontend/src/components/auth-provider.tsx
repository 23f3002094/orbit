"use client";

import type { Session, User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { syncProfile } from "@/lib/api";

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = getSupabaseClient();
    client.auth.getSession().then(({ data }) => { setSession(data.session); setIsLoading(false); if (data.session) void syncProfile().catch(() => { /* API availability should not block the session. */ }); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession) window.setTimeout(() => { void syncProfile().catch(() => { /* API availability should not block the session. */ }); }, 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isConfigured: isSupabaseConfigured,
    isLoading,
    session,
    user: session?.user ?? null,
    signOut: async () => { if (isSupabaseConfigured) await getSupabaseClient().auth.signOut(); },
  }), [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isConfigured, isLoading, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isConfigured) {
      if (!isLoginPage) router.replace("/login");
      return;
    }
    if (!isLoading && !user && !isLoginPage) router.replace("/login");
    if (!isLoading && user && isLoginPage) router.replace("/");
  }, [isConfigured, isLoading, isLoginPage, router, user]);

  if (isLoginPage) return <>{children}</>;
  if (isLoading) return <main className="grid min-h-screen place-items-center bg-[#050505] text-[#fffaf7]"><p className="text-sm text-[#ffc18c]">Opening your Orbit...</p></main>;
  if (!isConfigured || !user) return <main className="grid min-h-screen place-items-center bg-[#050505] text-[#fffaf7]"><p className="text-sm text-[#ffc18c]">Taking you to sign in...</p></main>;
  return <>{children}</>;
}
