"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface Me {
  id: number;
  username: string;
  nickname?: string;
  role: string;
  balance?: number;
}

interface SessionContextType {
  data: { data: Me } | undefined;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({ data: undefined, isLoading: true });

async function fetchMe(): Promise<{ data: Me }> {
  const token = localStorage.getItem("token");
  if (!token) return { data: null as unknown as Me };
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useQuery({ queryKey: ["me"], queryFn: fetchMe, staleTime: 60_000 });
  return (
    <SessionContext.Provider value={{ data: query.data, isLoading: query.isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
