"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Notebook, Send } from "lucide-react";
import { addClinicalNote } from "@/app/(main)/patients/[id]/notes/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toTitleCase } from "@/lib/format";

export type NoteEntry = {
  id: number;
  content: string;
  noteDate: string;
  doctorName: string;
  chainId: number | null;
  chainTitle: string | null;
};

export type ChainOption = {
  id: number;
  title: string;
};

function formatNoteDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ClinicalNotepad({
  patientId,
  notes,
  chains,
  canAddNotes,
  currentDoctorName,
}: {
  patientId: number;
  notes: NoteEntry[];
  chains: ChainOption[];
  canAddNotes: boolean;
  currentDoctorName?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<string>("none");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes.length]);

  // Group notes by chain
  const chainNotes: Record<number, NoteEntry[]> = {};
  const unchainedNotes: NoteEntry[] = [];

  for (const note of notes) {
    if (note.chainId) {
      if (!chainNotes[note.chainId]) chainNotes[note.chainId] = [];
      chainNotes[note.chainId].push(note);
    } else {
      unchainedNotes.push(note);
    }
  }

  // Order chains by first note date
  const chainOrder = Object.entries(chainNotes)
    .map(([chainId, notes]) => ({
      chainId: parseInt(chainId),
      title: notes[0].chainTitle || "Unknown Chain",
      notes,
      firstDate: notes[0].noteDate,
    }))
    .sort((a, b) => a.firstDate.localeCompare(b.firstDate));

  function handleSubmit() {
    if (!content.trim()) return;
    startTransition(async () => {
      try {
        await addClinicalNote(
          patientId,
          content,
          selectedChainId !== "none" ? parseInt(selectedChainId) : null,
        );
        setContent("");
        toast.success("Note saved");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save note");
      }
    });
  }

  const hasNotes = notes.length > 0;

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
        <Notebook className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Clinical Notes</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {notes.length} {notes.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Notes area — scrollable lined paper effect */}
      <div className="max-h-[500px] overflow-y-auto px-4 py-3 space-y-0 font-mono text-[13px] leading-relaxed bg-[repeating-linear-gradient(transparent,transparent_27px,hsl(var(--border)/0.3)_28px)]">
        {!hasNotes && (
          <div className="text-center text-muted-foreground py-8">
            <Notebook className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No clinical notes yet</p>
            <p className="text-xs mt-1">Add the first note below</p>
          </div>
        )}

        {/* Chain sections */}
        {chainOrder.map((chainGroup) => (
          <div key={chainGroup.chainId} className="mb-4">
            {/* Major divider */}
            <div className="text-primary font-bold py-1 tracking-wide border-b-2 border-double border-primary/30 mb-2">
              ═══ {chainGroup.title} ═══
            </div>

            {/* Notes within chain, grouped by date */}
            {renderNotesByDate(chainGroup.notes)}
          </div>
        ))}

        {/* Unchained notes */}
        {unchainedNotes.length > 0 && (
          <div className="mb-4">
            {chainOrder.length > 0 && (
              <div className="text-muted-foreground font-bold py-1 tracking-wide border-b-2 border-double border-muted-foreground/20 mb-2">
                ═══ Other Notes ═══
              </div>
            )}
            {renderNotesByDate(unchainedNotes)}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canAddNotes && (
        <div className="border-t p-3 space-y-2 bg-muted/10">
          <div className="flex gap-2 items-center">
            {chains.length > 0 && (
              <Select
                value={selectedChainId}
                onValueChange={setSelectedChainId}
              >
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Chain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No chain</SelectItem>
                  {chains.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {currentDoctorName && (
              <span className="text-xs text-muted-foreground ml-auto">
                Dr. {toTitleCase(currentDoctorName)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your note here..."
              rows={3}
              className="text-sm font-mono resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || !content.trim()}
              className="self-end"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              {isPending ? "..." : "Save"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            ⌘+Enter to save · Notes are append-only
          </p>
        </div>
      )}
    </div>
  );
}

function renderNotesByDate(notes: NoteEntry[]) {
  // Group by date
  const byDate: Record<string, NoteEntry[]> = {};
  for (const note of notes) {
    const dateKey = formatNoteDate(note.noteDate);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(note);
  }

  return Object.entries(byDate).map(([date, dateNotes], i) => (
    <div key={`${date}-${i}`}>
      {/* Minor divider between dates */}
      {i > 0 && (
        <div className="text-muted-foreground/40 py-0.5 tracking-[0.3em] text-xs">
          ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        </div>
      )}
      {/* Date + doctor header */}
      <div className="text-muted-foreground text-xs font-semibold mb-0.5">
        {date} — Dr. {toTitleCase(dateNotes[0].doctorName)}
      </div>
      {/* Notes content */}
      {dateNotes.map((note) => (
        <div key={note.id} className="whitespace-pre-wrap text-foreground mb-1">
          {note.content}
        </div>
      ))}
    </div>
  ));
}
