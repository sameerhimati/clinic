"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3 md:ml-0 ml-12">
        <h1 className="text-lg font-semibold hidden sm:block">
          Secunderabad Dental Hospital
        </h1>
        <h1 className="text-lg font-semibold sm:hidden">SDH</h1>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Centre for Advanced Dental Care
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </div>
    </header>
  );
}
