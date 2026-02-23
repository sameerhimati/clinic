"use client";

import { useState, useMemo, useRef, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type PendingVisit = {
  id: number;
  caseNo: number | null;
  visitDate: Date;
  operationRate: number | null;
  discount: number;
  patient: { name: string; code: number | null };
  operation: { name: string } | null;
  billed: number;
  paid: number;
  balance: number;
};

export function ReceiptForm({
  visits,
  defaultVisitId,
  action,
}: {
  visits: PendingVisit[];
  defaultVisitId?: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<PendingVisit | null>(
    () => {
      if (defaultVisitId) {
        return visits.find((v) => v.id === parseInt(defaultVisitId)) || null;
      }
      return null;
    }
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return visits;
    const q = search.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(q);
    return visits.filter((v) => {
      if (isNumeric) {
        return (
          v.patient.code?.toString().includes(q) ||
          (v.caseNo && v.caseNo.toString().includes(q))
        );
      }
      return v.patient.name.toLowerCase().includes(q);
    });
  }, [search, visits]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  function selectVisit(v: PendingVisit) {
    setSelectedVisit(v);
    setShowDropdown(false);
    setSearch("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        selectVisit(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={handleSubmit} className="space-y-6">
      {selectedVisit && (
        <input type="hidden" name="visitId" value={selectedVisit.id} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Searchable visit selector */}
          <div className="space-y-2">
            <Label>
              Pending Bill <span className="text-destructive">*</span>
            </Label>

            {selectedVisit ? (
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 p-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Badge variant="outline" className="font-mono text-xs">
                      #{selectedVisit.patient.code}
                    </Badge>
                    <span>{selectedVisit.patient.name}</span>
                    <span className="text-muted-foreground">
                      Case #{selectedVisit.caseNo || selectedVisit.id}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{selectedVisit.operation?.name || "Visit"}</span>
                    <span>
                      Billed: ₹{selectedVisit.billed.toLocaleString("en-IN")}
                    </span>
                    <span>
                      Paid: ₹{selectedVisit.paid.toLocaleString("en-IN")}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      Due: ₹{selectedVisit.balance.toLocaleString("en-IN")}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedVisit(null);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <div ref={wrapperRef} className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by patient code, name, or case #..."
                  autoComplete="off"
                />
                {showDropdown && (
                  <div className="absolute top-full left-0 z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
                    {filtered.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No pending bills found
                      </div>
                    ) : (
                      filtered.map((v, i) => (
                        <button
                          key={v.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                            i === highlightIndex ? "bg-accent" : ""
                          }`}
                          onMouseEnter={() => setHighlightIndex(i)}
                          onClick={() => selectVisit(v)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{v.patient.code}
                              </span>
                              <span className="font-medium">
                                {v.patient.name}
                              </span>
                              <span className="text-muted-foreground">
                                · {v.operation?.name || "Visit"}
                              </span>
                            </div>
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              ₹{v.balance.toLocaleString("en-IN")}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            Case #{v.caseNo || v.id} ·{" "}
                            {new Date(v.visitDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · Billed ₹{v.billed.toLocaleString("en-IN")} · Paid
                            ₹{v.paid.toLocaleString("en-IN")}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {!selectedVisit && (
              <p className="text-xs text-muted-foreground">
                Only visits with outstanding balance are shown
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedVisit?.balance || undefined}
                required
                placeholder="0.00"
              />
              {selectedVisit && (
                <p className="text-xs text-muted-foreground">
                  Max: ₹{selectedVisit.balance.toLocaleString("en-IN")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <select
                name="paymentMode"
                defaultValue="Cash"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptDate">Receipt Date</Label>
            <Input name="receiptDate" type="date" defaultValue={today} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea name="notes" rows={2} placeholder="Optional notes..." />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!selectedVisit || isPending}>
        {isPending ? "Creating..." : "Create Receipt"}
      </Button>
    </form>
  );
}
