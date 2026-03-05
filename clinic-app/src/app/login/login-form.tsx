"use client";

import { useActionState } from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { login } from "./actions";
import { Check, ChevronsUpDown, Search } from "lucide-react";

type Doctor = { id: number; name: string; code: number | null };

export function LoginForm({ doctors }: { doctors: Doctor[] }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      return await login(formData);
    },
    null
  );

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = doctors.filter(
    (d) => d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Select User</Label>
            <input type="hidden" name="doctorId" value={selectedDoctor?.id || ""} />
            <div ref={ref} className="relative">
              <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm hover:bg-accent transition-colors"
              >
                <span className={selectedDoctor ? "" : "text-muted-foreground"}>
                  {selectedDoctor ? selectedDoctor.name : "Select user..."}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
              </button>

              {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                  <div className="flex items-center border-b px-3">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Type to filter..."
                      className="flex h-9 w-full bg-transparent px-2 py-1 text-sm outline-none"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {filtered.length === 0 && (
                      <div className="py-4 text-center text-sm text-muted-foreground">No users found</div>
                    )}
                    {filtered.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                          selectedDoctor?.id === doc.id ? "bg-accent" : ""
                        }`}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        <Check className={`h-3.5 w-3.5 shrink-0 ${selectedDoctor?.id === doc.id ? "opacity-100" : "opacity-0"}`} />
                        <span>{doc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending || !selectedDoctor}>
            {pending ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
