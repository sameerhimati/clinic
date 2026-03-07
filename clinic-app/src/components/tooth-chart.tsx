"use client";

/**
 * Interactive FDI dental chart with odontogram support.
 *
 * Layout:
 *   Upper Right (Q1) | Upper Left (Q2)
 *   18...11           | 21...28
 *   ─────────────────────────
 *   48...41           | 31...38
 *   Lower Right (Q4) | Lower Left (Q3)
 *
 * Supports:
 *   - Click to toggle selection
 *   - Click-and-drag to select ranges within an arch
 *   - Double-click to open detail panel
 *   - Visual status indicators (symbols + colors)
 */

import { useState, useCallback, useRef } from "react";
import { getStatusColor, TOOTH_STATUS_INDICATORS } from "@/lib/dental";

const Q1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Upper Right
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Upper Left
const Q4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Lower Right
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Lower Left

const UPPER = [...Q1, ...Q2];
const LOWER = [...Q4, ...Q3];

export type ToothStatusData = {
  toothNumber: number;
  status: string;
  findingName?: string;
  color?: string;
};

export function ToothChart({
  selected = [],
  onChange,
  readOnly = false,
  compact = false,
  toothStatuses,
  onDoubleClick,
  highlightTeeth,
}: {
  selected?: number[];
  onChange?: (teeth: number[]) => void;
  readOnly?: boolean;
  compact?: boolean;
  toothStatuses?: ToothStatusData[];
  onDoubleClick?: (tooth: number) => void;
  highlightTeeth?: number[];
}) {
  const selectedSet = new Set(selected);
  const highlightSet = highlightTeeth ? new Set(highlightTeeth) : null;

  // Build status lookup map
  const statusMap = new Map<number, ToothStatusData>();
  if (toothStatuses) {
    for (const ts of toothStatuses) {
      statusMap.set(ts.toothNumber, ts);
    }
  }

  // Drag selection state
  const isDragging = useRef(false);
  const dragStartTooth = useRef<number | null>(null);
  const dragMoved = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClick = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (tooth: number, e: React.MouseEvent) => {
      if (readOnly || !onChange) return;
      e.preventDefault();
      isDragging.current = true;
      dragStartTooth.current = tooth;
      dragMoved.current = false;
    },
    [readOnly, onChange]
  );

  const handleMouseEnter = useCallback(
    (tooth: number) => {
      if (!isDragging.current || readOnly || !onChange) return;
      dragMoved.current = true;
      // Range select within same arch as start tooth
      const start = dragStartTooth.current;
      if (start === null) return;

      const isStartUpper = UPPER.includes(start);
      const isToothUpper = UPPER.includes(tooth);
      if (isStartUpper !== isToothUpper) return; // cross-arch: ignore

      const arch = isStartUpper ? UPPER : LOWER;
      const idx1 = arch.indexOf(start);
      const idx2 = arch.indexOf(tooth);
      if (idx1 === -1 || idx2 === -1) return;

      const lo = Math.min(idx1, idx2);
      const hi = Math.max(idx1, idx2);
      const rangeTeeth = arch.slice(lo, hi + 1);

      // Build new selection: keep any teeth not in this arch, plus the range
      const newSet = new Set(selected.filter((t) => !arch.includes(t)));
      for (const t of rangeTeeth) newSet.add(t);
      onChange(Array.from(newSet));
    },
    [readOnly, onChange, selected]
  );

  const handleMouseUp = useCallback(
    (tooth: number) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      if (!dragMoved.current && onChange && !readOnly) {
        // No drag happened — this is a single click toggle
        // Delay to distinguish from double-click
        if (clickTimer.current) {
          clearTimeout(clickTimer.current);
          clickTimer.current = null;
          // This is the second click (double-click)
          pendingClick.current = null;
          if (onDoubleClick) onDoubleClick(tooth);
          return;
        }

        pendingClick.current = tooth;
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          // Single click — toggle selection
          const next = selectedSet.has(tooth)
            ? selected.filter((t) => t !== tooth)
            : [...selected, tooth];
          onChange(next);
          pendingClick.current = null;
        }, 200);
      }

      dragStartTooth.current = null;
      dragMoved.current = false;
    },
    [readOnly, onChange, selected, selectedSet, onDoubleClick]
  );

  const handleGlobalMouseUp = useCallback(() => {
    isDragging.current = false;
    dragStartTooth.current = null;
    dragMoved.current = false;
  }, []);

  // Touch support for mobile drag
  const touchStartTooth = useRef<number | null>(null);
  const handleTouchStart = useCallback(
    (tooth: number) => {
      if (readOnly || !onChange) return;
      touchStartTooth.current = tooth;
    },
    [readOnly, onChange]
  );

  const handleTouchEnd = useCallback(
    (tooth: number) => {
      if (readOnly || !onChange) return;
      if (touchStartTooth.current === tooth) {
        // Simple tap — toggle
        const next = selectedSet.has(tooth)
          ? selected.filter((t) => t !== tooth)
          : [...selected, tooth];
        onChange(next);
      }
      touchStartTooth.current = null;
    },
    [readOnly, onChange, selected, selectedSet]
  );

  function toggleQuadrant(quadrant: number[]) {
    if (readOnly || !onChange) return;
    const allSelected = quadrant.every((t) => selectedSet.has(t));
    if (allSelected) {
      onChange(selected.filter((t) => !quadrant.includes(t)));
    } else {
      const newSet = new Set(selected);
      for (const t of quadrant) newSet.add(t);
      onChange(Array.from(newSet));
    }
  }

  function toggleArch(arch: number[]) {
    if (readOnly || !onChange) return;
    const allSelected = arch.every((t) => selectedSet.has(t));
    if (allSelected) {
      onChange(selected.filter((t) => !arch.includes(t)));
    } else {
      const newSet = new Set(selected);
      for (const t of arch) newSet.add(t);
      onChange(Array.from(newSet));
    }
  }

  const cellSize = compact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  const gap = compact ? "gap-0.5" : "gap-1";

  function ToothCell({ tooth }: { tooth: number }) {
    const isSelected = selectedSet.has(tooth);
    const isHighlighted = highlightSet?.has(tooth);
    const toothStatus = statusMap.get(tooth);
    const statusKey = toothStatus?.status || "HEALTHY";
    const indicator = TOOTH_STATUS_INDICATORS[statusKey];
    const isMissing = statusKey === "MISSING" || statusKey === "EXTRACTED";

    // Determine background color
    let bgClass = readOnly
      ? "bg-muted text-muted-foreground"
      : "bg-muted/50 text-muted-foreground hover:bg-accent cursor-pointer";

    let bgStyle: React.CSSProperties | undefined;

    if (isSelected) {
      bgClass = "bg-primary text-primary-foreground";
    } else if (toothStatus && statusKey !== "HEALTHY") {
      const color = toothStatus.color || getStatusColor(statusKey);
      bgStyle = { backgroundColor: color, color: "#fff" };
      bgClass = readOnly ? "" : "hover:brightness-110 cursor-pointer";
    }

    return (
      <button
        type="button"
        onMouseDown={(e) => handleMouseDown(tooth, e)}
        onMouseEnter={() => handleMouseEnter(tooth)}
        onMouseUp={() => handleMouseUp(tooth)}
        onTouchStart={() => handleTouchStart(tooth)}
        onTouchEnd={() => handleTouchEnd(tooth)}
        disabled={readOnly && !onDoubleClick}
        className={`${cellSize} rounded font-mono font-medium transition-colors relative select-none flex items-center justify-center ${bgClass} ${
          isHighlighted && !isSelected ? "ring-2 ring-amber-400" : ""
        }`}
        style={!isSelected ? bgStyle : undefined}
        title={
          toothStatus
            ? `Tooth ${tooth} — ${toothStatus.findingName || statusKey}`
            : `Tooth ${tooth}`
        }
      >
        <span className={isMissing && !isSelected ? "line-through opacity-60" : ""}>
          {tooth}
        </span>
        {indicator && !isSelected && !compact && (
          <span className="absolute bottom-0 right-0.5 text-[7px] leading-none font-bold opacity-90">
            {indicator}
          </span>
        )}
      </button>
    );
  }

  // Collect unique statuses present in data for legend
  const presentStatuses = new Map<string, string>();
  if (toothStatuses) {
    for (const ts of toothStatuses) {
      if (ts.status !== "HEALTHY") {
        const label = ts.findingName || ts.status;
        const color = ts.color || getStatusColor(ts.status);
        if (!presentStatuses.has(label)) {
          presentStatuses.set(label, color);
        }
      }
    }
  }

  const showQuadrantButtons = !readOnly && onChange && !compact;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="inline-block select-none"
      onMouseLeave={handleGlobalMouseUp}
    >
      {/* Quadrant shortcuts */}
      {showQuadrantButtons && (
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            onClick={() => toggleQuadrant(Q1)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Q1
          </button>
          <button
            type="button"
            onClick={() => toggleQuadrant(Q2)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Q2
          </button>
          <div className="w-px bg-border mx-0.5" />
          <button
            type="button"
            onClick={() => toggleArch(UPPER)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Upper
          </button>
          <button
            type="button"
            onClick={() => toggleArch(LOWER)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Lower
          </button>
          <div className="w-px bg-border mx-0.5" />
          <button
            type="button"
            onClick={() => toggleQuadrant(Q4)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Q4
          </button>
          <button
            type="button"
            onClick={() => toggleQuadrant(Q3)}
            className="px-2 py-0.5 text-[10px] rounded border border-input hover:bg-accent transition-colors"
          >
            Q3
          </button>
        </div>
      )}

      {/* Labels */}
      {!compact && (
        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5 px-1">
          <span>Upper Right (Q1)</span>
          <span>Upper Left (Q2)</span>
        </div>
      )}
      {/* Upper row */}
      <div className="flex items-center">
        <div className={`flex ${gap}`}>
          {Q1.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        <div className={`flex ${gap}`}>
          {Q2.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
      </div>
      {/* Horizontal divider */}
      <div className="h-px bg-border my-1" />
      {/* Lower row */}
      <div className="flex items-center">
        <div className={`flex ${gap}`}>
          {Q4.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        <div className={`flex ${gap}`}>
          {Q3.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
      </div>
      {!compact && (
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 px-1">
          <span>Lower Right (Q4)</span>
          <span>Lower Left (Q3)</span>
        </div>
      )}
      {/* Selected count */}
      {selected.length > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {selected.length} {selected.length === 1 ? "tooth" : "teeth"} selected:{" "}
          {selected.sort((a, b) => a - b).join(", ")}
        </div>
      )}
      {/* Status legend */}
      {presentStatuses.size > 0 && !compact && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Array.from(presentStatuses.entries()).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Compact inline badge showing selected teeth */
export function TeethBadge({ teeth }: { teeth: number[] }) {
  if (teeth.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="font-mono">
        {teeth.sort((a, b) => a - b).join(", ")}
      </span>
    </span>
  );
}
