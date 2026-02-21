"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: number;
  code: number | null;
  salutation: string | null;
  name: string;
  mobile: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  ageAtRegistration: number | null;
  createdAt: string;
  visits: { visitDate: string }[];
};

export function PatientSearch({ size = "default" }: { size?: "default" | "large" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.patients || []);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Global "/" shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navigateToPatient = useCallback((id: number) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/patients/${id}`);
  }, [router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigateToPatient(results[selectedIndex].id);
        return;
      }
      // If only 1 result, navigate directly
      if (results.length === 1) {
        navigateToPatient(results[0].id);
        return;
      }
      // Exact code match
      const isNumeric = /^\d+$/.test(query.trim());
      if (isNumeric) {
        const exact = results.find((r) => r.code === parseInt(query.trim()));
        if (exact) {
          navigateToPatient(exact.id);
          return;
        }
      }
    }
  }

  function getAge(result: SearchResult): string | null {
    if (result.dateOfBirth) {
      const dob = new Date(result.dateOfBirth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
      return `${age}`;
    }
    if (result.ageAtRegistration) {
      const regDate = new Date(result.createdAt);
      const years = new Date().getFullYear() - regDate.getFullYear();
      return `~${result.ageAtRegistration + years}`;
    }
    return null;
  }

  const isLarge = size === "large";

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
          isLarge ? "h-5 w-5" : "h-4 w-4"
        )} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search patient by code, name, or phone..."
          className={cn(
            "w-full rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            isLarge ? "pl-11 pr-12 py-3 text-base" : "pl-9 pr-10 py-2"
          )}
        />
        <kbd className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none rounded border border-muted bg-muted/50 px-1.5 font-mono text-muted-foreground",
          isLarge ? "text-xs" : "text-[10px]",
          query.length > 0 ? "hidden" : ""
        )}>/</kbd>
      </div>

      {/* Dropdown */}
      {isOpen && (query.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-96 overflow-auto">
          {loading && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
          )}
          {!loading && results.length === 0 && query.length >= 1 && (
            <div className="p-3 text-sm text-muted-foreground text-center">No patients found</div>
          )}
          {results.map((r, i) => {
            const age = getAge(r);
            const lastVisit = r.visits[0]?.visitDate;
            return (
              <button
                key={r.id}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b last:border-0",
                  selectedIndex === i && "bg-accent"
                )}
                onMouseDown={() => navigateToPatient(r.id)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">#{r.code}</span>
                    <span className="font-medium">
                      {r.salutation && `${r.salutation}. `}{r.name}
                    </span>
                  </div>
                  {r.mobile && (
                    <span className="text-muted-foreground text-xs">{r.mobile}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {age && <span>{age}/{r.gender || "?"}</span>}
                  {lastVisit && (
                    <span> · Last visit: {new Date(lastVisit).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
