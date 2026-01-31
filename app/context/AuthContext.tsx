"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
  session?: Session | null;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  // Wrap children in SessionProvider with optional pre-fetched session
  // When session is provided from server-side, it prevents the initial client fetch
  // which avoids the CLIENT_FETCH_ERROR during Turbopack compilation in development
  return (
    <SessionProvider
      // Pass the server-side session to prevent initial client fetch
      session={session}
      // Disable refetching session on window focus to reduce unnecessary requests
      refetchOnWindowFocus={false}
      // Don't auto-refetch - components will request session when needed  
      refetchInterval={0}
      // Explicit basePath for session requests
      basePath="/api/auth"
    >
      {children}
    </SessionProvider>
  );
}
