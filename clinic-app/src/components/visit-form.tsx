"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronsUpDown } from "lucide-react";

export type Operation = { id: number; name: string; category: string | null; defaultMinFee: number | null; labCostEstimate?: number | null; doctorFee?: number | null };
export type Doctor = { id: number; name: string; commissionPercent: number };
export type Lab = { id: number; name: string; rates: { id: number; itemName: string; rate: number }[] };

export function formatINR(amount: number): string {
  return amount.toLocaleString("en-IN");
}

// --- Operation Combobox ---
export function OperationCombobox({
  operations,
  defaultOperationId,
  onSelect,
  allowCustom = false,
}: {
  operations: Operation[];
  defaultOperationId?: number;
  onSelect: (op: Operation | null, isCustom?: boolean) => void;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | undefined>(defaultOperationId);
  const [isCustom, setIsCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = isCustom ? null : operations.find((o) => o.id === selectedId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = operations.filter(
    (op) => op.name.toLowerCase().includes(search.toLowerCase())
  );
  const categories = new Map<string, Operation[]>();
  for (const op of filtered) {
    const cat = op.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(op);
  }

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="operationId" value={isCustom ? "" : (selectedId || "")} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm hover:bg-accent transition-colors"
      >
        <span className={selected || isCustom ? "" : "text-muted-foreground"}>
          {isCustom
            ? "Custom Procedure"
            : selected
              ? `${selected.name}${selected.defaultMinFee ? ` — ₹${formatINR(selected.defaultMinFee)}` : ""}`
              : "Search procedures..."}
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
            {filtered.length === 0 && !allowCustom && (
              <div className="py-4 text-center text-sm text-muted-foreground">No procedures found</div>
            )}
            {Array.from(categories.entries()).map(([cat, ops]) => (
              <div key={cat}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{cat}</div>
                {ops.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                      !isCustom && selectedId === op.id ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(op.id);
                      setIsCustom(false);
                      onSelect(op, false);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check className={`h-3.5 w-3.5 shrink-0 ${!isCustom && selectedId === op.id ? "opacity-100" : "opacity-0"}`} />
                    <span className="truncate">{op.name}</span>
                    {op.defaultMinFee != null && op.defaultMinFee > 0 ? (
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">₹{formatINR(op.defaultMinFee)}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ))}
            {/* Custom Treatment option */}
            {allowCustom && (
              <div>
                <div className="border-t my-1" />
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer ${
                    isCustom ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(undefined);
                    setIsCustom(true);
                    onSelect(null, true);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${isCustom ? "opacity-100" : "opacity-0"}`} />
                  <span className="text-primary font-medium">Custom Procedure...</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
