"use client";

import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/app/login/logout-action";
import { PatientSearch } from "@/components/patient-search";

export function Topbar() {
  const { doctor } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2 shrink-0 md:ml-0 ml-12">
        <h1 className="text-sm font-semibold hidden lg:block">SDH</h1>
      </div>

      <div className="flex-1 max-w-lg mx-auto">
        <PatientSearch />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline font-medium">{doctor.name}</span>
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Logout</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
