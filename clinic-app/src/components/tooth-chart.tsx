"use client";

/**
 * Interactive FDI dental chart.
 *
 * Layout:
 *   Upper Right (Q1) | Upper Left (Q2)
 *   18…11           | 21…28
 *   ─────────────────────────
 *   48…41           | 31…38
 *   Lower Right (Q4) | Lower Left (Q3)
 */

const Q1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Upper Right
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Upper Left
const Q4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Lower Right
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Lower Left

export function ToothChart({
  selected = [],
  onChange,
  readOnly = false,
  compact = false,
}: {
  selected?: number[];
  onChange?: (teeth: number[]) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const selectedSet = new Set(selected);

  function toggle(tooth: number) {
    if (readOnly || !onChange) return;
    const next = selectedSet.has(tooth)
      ? selected.filter((t) => t !== tooth)
      : [...selected, tooth];
    onChange(next);
  }

  const cellSize = compact ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  const gap = compact ? "gap-0.5" : "gap-1";

  function ToothCell({ tooth }: { tooth: number }) {
    const isSelected = selectedSet.has(tooth);
    return (
      <button
        type="button"
        onClick={() => toggle(tooth)}
        disabled={readOnly}
        className={`${cellSize} rounded font-mono font-medium transition-colors flex items-center justify-center ${
          isSelected
            ? "bg-primary text-primary-foreground"
            : readOnly
              ? "bg-muted text-muted-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-accent cursor-pointer"
        } ${readOnly ? "" : "cursor-pointer"}`}
        title={`Tooth ${tooth}`}
      >
        {tooth}
      </button>
    );
  }

  return (
    <div className="inline-block">
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
          {Q1.map((t) => <ToothCell key={t} tooth={t} />)}
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        <div className={`flex ${gap}`}>
          {Q2.map((t) => <ToothCell key={t} tooth={t} />)}
        </div>
      </div>
      {/* Horizontal divider */}
      <div className="h-px bg-border my-1" />
      {/* Lower row */}
      <div className="flex items-center">
        <div className={`flex ${gap}`}>
          {Q4.map((t) => <ToothCell key={t} tooth={t} />)}
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        <div className={`flex ${gap}`}>
          {Q3.map((t) => <ToothCell key={t} tooth={t} />)}
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
          {selected.length} {selected.length === 1 ? "tooth" : "teeth"} selected: {selected.sort((a, b) => a - b).join(", ")}
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
      <span className="font-mono">{teeth.sort((a, b) => a - b).join(", ")}</span>
    </span>
  );
}
