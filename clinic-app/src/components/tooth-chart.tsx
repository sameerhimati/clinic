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
 *   - Size variants: sm, md, lg
 */

import { useState, useCallback, useRef } from "react";
import { getToothName, getStatusColor, TOOTH_STATUSES, TOOTH_STATUS_INDICATORS, type ToothStatusKey } from "@/lib/dental";

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

type ChartSize = "sm" | "md" | "lg";

const SIZE_CONFIG: Record<ChartSize, { cell: string; gap: string; indicator: string; dividerH: string }> = {
  sm: { cell: "w-7 h-7 text-[11px]", gap: "gap-1", indicator: "", dividerH: "h-5" },
  md: { cell: "w-8 h-8 text-xs", gap: "gap-1.5", indicator: "text-[8px]", dividerH: "h-6" },
  lg: { cell: "w-9 h-9 text-xs sm:w-10 sm:h-10 sm:text-sm", gap: "gap-1", indicator: "text-[10px] font-semibold", dividerH: "h-7 sm:h-8" },
};

export function ToothChart({
  selected = [],
  onChange,
  readOnly = false,
  compact = false,
  size,
  toothStatuses,
  onDoubleClick,
  highlightTeeth,
}: {
  selected?: number[];
  onChange?: (teeth: number[]) => void;
  readOnly?: boolean;
  compact?: boolean;
  size?: ChartSize;
  toothStatuses?: ToothStatusData[];
  onDoubleClick?: (tooth: number) => void;
  highlightTeeth?: number[];
}) {
  const resolvedSize: ChartSize = compact ? "sm" : size || "md";
  const config = SIZE_CONFIG[resolvedSize];
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

  const handleMouseDown = useCallback(
    (tooth: number, e: React.MouseEvent) => {
      if (readOnly && !onDoubleClick) return;
      if (readOnly) {
        isDragging.current = true;
        dragMoved.current = false;
        return;
      }
      if (!onChange) return;
      e.preventDefault();
      isDragging.current = true;
      dragStartTooth.current = tooth;
      dragMoved.current = false;
    },
    [readOnly, onChange, onDoubleClick]
  );

  const handleMouseEnter = useCallback(
    (tooth: number) => {
      if (!isDragging.current || readOnly || !onChange) return;
      dragMoved.current = true;
      const start = dragStartTooth.current;
      if (start === null) return;

      const isStartUpper = UPPER.includes(start);
      const isToothUpper = UPPER.includes(tooth);
      if (isStartUpper !== isToothUpper) return;

      const arch = isStartUpper ? UPPER : LOWER;
      const idx1 = arch.indexOf(start);
      const idx2 = arch.indexOf(tooth);
      if (idx1 === -1 || idx2 === -1) return;

      const lo = Math.min(idx1, idx2);
      const hi = Math.max(idx1, idx2);
      const rangeTeeth = arch.slice(lo, hi + 1);

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

      if (!dragMoved.current) {
        if (readOnly && onDoubleClick) {
          onDoubleClick(tooth);
        } else if (onChange && !readOnly) {
          const next = selectedSet.has(tooth)
            ? selected.filter((t) => t !== tooth)
            : [...selected, tooth];
          onChange(next);
        }
      }

      dragStartTooth.current = null;
      dragMoved.current = false;
    },
    [readOnly, onChange, selected, selectedSet, onDoubleClick]
  );

  const handleDoubleClick = useCallback(
    (tooth: number) => {
      if (!readOnly && onDoubleClick) {
        onDoubleClick(tooth);
      }
    },
    [readOnly, onDoubleClick]
  );

  const handleGlobalMouseUp = useCallback(() => {
    isDragging.current = false;
    dragStartTooth.current = null;
    dragMoved.current = false;
  }, []);

  // Touch support
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

  function ToothCell({ tooth }: { tooth: number }) {
    const isSelected = selectedSet.has(tooth);
    const isHighlighted = highlightSet?.has(tooth);
    const toothStatus = statusMap.get(tooth);
    const statusKey = toothStatus?.status || "HEALTHY";
    const indicator = TOOTH_STATUS_INDICATORS[statusKey];
    const isMissing = statusKey === "MISSING" || statusKey === "EXTRACTED";
    const showIndicator = resolvedSize !== "sm" && indicator && !isSelected;

    // Determine background
    let bgClass: string;
    let bgStyle: React.CSSProperties | undefined;

    if (isSelected) {
      bgClass = "bg-primary text-primary-foreground";
    } else if (toothStatus && statusKey !== "HEALTHY") {
      const color = toothStatus.color || getStatusColor(statusKey);
      bgStyle = { backgroundColor: color, color: "#fff" };
      bgClass = readOnly ? "" : "hover:brightness-110 cursor-pointer";
    } else {
      // Healthy tooth — white outlined
      bgClass = readOnly
        ? `bg-background border ${isMissing ? "border-dashed" : ""} border-border/50 text-muted-foreground`
        : `bg-background border ${isMissing ? "border-dashed" : ""} border-border/50 text-muted-foreground hover:bg-accent cursor-pointer`;
    }

    const toothName = getToothName(tooth);
    const tooltipText = toothStatus && statusKey !== "HEALTHY"
      ? `${toothName} — ${toothStatus.findingName || TOOTH_STATUSES[statusKey as ToothStatusKey]?.label || statusKey}`
      : toothName;

    return (
      <button
        type="button"
        onMouseDown={(e) => handleMouseDown(tooth, e)}
        onMouseEnter={() => handleMouseEnter(tooth)}
        onMouseUp={() => handleMouseUp(tooth)}
        onDoubleClick={() => handleDoubleClick(tooth)}
        onTouchStart={() => handleTouchStart(tooth)}
        onTouchEnd={() => handleTouchEnd(tooth)}
        disabled={readOnly && !onDoubleClick}
        className={`${config.cell} rounded font-mono font-medium transition-colors relative select-none flex items-center justify-center ${bgClass} ${
          isHighlighted && !isSelected ? "ring-2 ring-amber-400" : ""
        }`}
        style={!isSelected ? bgStyle : undefined}
        title={tooltipText}
      >
        <span className={isMissing && !isSelected ? "line-through opacity-60" : ""}>
          {tooth}
        </span>
        {showIndicator && (
          <span className={`absolute bottom-0 right-0.5 leading-none opacity-90 ${config.indicator}`}>
            {indicator}
          </span>
        )}
      </button>
    );
  }

  // Collect unique statuses for legend
  const presentStatuses = new Map<string, { color: string; indicator: string }>();
  if (toothStatuses) {
    for (const ts of toothStatuses) {
      if (ts.status !== "HEALTHY" && !presentStatuses.has(ts.status)) {
        const color = ts.color || getStatusColor(ts.status);
        const ind = TOOTH_STATUS_INDICATORS[ts.status] || "";
        presentStatuses.set(ts.status, { color, indicator: ind });
      }
    }
  }

  const showQuadrantButtons = !readOnly && onChange && resolvedSize !== "sm";
  const showLabels = resolvedSize !== "sm";

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="inline-block select-none"
      onMouseLeave={handleGlobalMouseUp}
    >
      {/* Quadrant shortcuts */}
      {showQuadrantButtons && (
        <div className="flex gap-1 mb-2">
          <button type="button" onClick={() => toggleQuadrant(Q1)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Q1</button>
          <button type="button" onClick={() => toggleQuadrant(Q2)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Q2</button>
          <div className="w-px bg-border mx-0.5" />
          <button type="button" onClick={() => toggleArch(UPPER)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Upper</button>
          <button type="button" onClick={() => toggleArch(LOWER)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Lower</button>
          <div className="w-px bg-border mx-0.5" />
          <button type="button" onClick={() => toggleQuadrant(Q4)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Q4</button>
          <button type="button" onClick={() => toggleQuadrant(Q3)} className="px-2.5 py-1 text-xs rounded border border-input hover:bg-accent transition-colors">Q3</button>
        </div>
      )}

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between text-muted-foreground mb-0.5 px-1">
          {resolvedSize === "lg" ? (
            <>
              <span className="text-xs font-medium">Right</span>
              <span className="text-xs font-medium">Left</span>
            </>
          ) : (
            <>
              <span className="text-[10px]">Upper Right (Q1)</span>
              <span className="text-[10px]">Upper Left (Q2)</span>
            </>
          )}
        </div>
      )}
      {/* Upper row */}
      <div className="flex items-center">
        <div className={`flex ${config.gap}`}>
          {Q1.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
        <div className={`w-px ${config.dividerH} bg-border mx-1`} />
        <div className={`flex ${config.gap}`}>
          {Q2.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
      </div>
      {/* Horizontal divider */}
      <div className="h-px bg-border my-1.5" />
      {/* Lower row */}
      <div className="flex items-center">
        <div className={`flex ${config.gap}`}>
          {Q4.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
        <div className={`w-px ${config.dividerH} bg-border mx-1`} />
        <div className={`flex ${config.gap}`}>
          {Q3.map((t) => (
            <ToothCell key={t} tooth={t} />
          ))}
        </div>
      </div>
      {showLabels && resolvedSize !== "lg" && (
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
      {presentStatuses.size > 0 && resolvedSize !== "sm" && (
        <div className="flex flex-wrap gap-3 mt-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
          {Array.from(presentStatuses.entries()).map(([statusKey, { color, indicator }]) => (
            <div key={statusKey} className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {indicator && <span className="text-[10px] font-mono font-semibold text-muted-foreground">{indicator}</span>}
              <span className="text-xs text-muted-foreground">{TOOTH_STATUSES[statusKey as ToothStatusKey]?.label || statusKey}</span>
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
