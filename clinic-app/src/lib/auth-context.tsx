"use client";

import { createContext, useContext } from "react";

export type AuthDoctor = {
  id: number;
  name: string;
  code: number | null;
  permissionLevel: number;
  designationId: number | null;
};

const AuthContext = createContext<{ doctor: AuthDoctor } | null>(null);

export function AuthProvider({
  doctor,
  children,
}: {
  doctor: AuthDoctor;
  children: React.ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ doctor }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
