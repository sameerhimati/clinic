"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  // Historical ClinicalReport entries (read-only, interleaved by date)
  isHistorical?: boolean;
  visitCaseNo?: number | null;
  operationName?: string | null;
  fields?: {
    complaint?: string | null;
    diagnosis?: string | null;
    treatmentNotes?: string | null;
    examination?: string | null;
    medication?: string | null;
  };
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
  visitId,
}: {
  patientId: number;
  notes: NoteEntry[];
  chains: ChainOption[];
  canAddNotes: boolean;
  currentDoctorName?: string;
  visitId?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes.length]);

  function handleSubmit() {
    if (!content.trim()) return;
    startTransition(async () => {
      try {
        await addClinicalNote(
          patientId,
          content,
          null, // no chain — always patient-level
          visitId ?? null,
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

      {/* Notes area — scrollable continuous stream */}
      <div className="max-h-[500px] overflow-y-auto px-4 py-3 space-y-0 font-mono text-sm leading-relaxed">
        {!hasNotes && (
          <div className="text-center text-muted-foreground py-8">
            <Notebook className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No clinical notes yet</p>
            <p className="text-xs mt-1">Add the first note below</p>
          </div>
        )}

        {/* All notes in a single reverse-chronological stream */}
        {hasNotes && renderNotesByDate(notes)}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canAddNotes && (
        <div className="border-t p-3 space-y-2 bg-muted/10">
          {currentDoctorName && (
            <div className="flex items-center">
              <span className="text-xs text-muted-foreground">
                Dr. {toTitleCase(currentDoctorName)}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your note here..."
              rows={4}
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
      {dateNotes.map((note) =>
        note.isHistorical ? (
          <div key={note.id} className="rounded bg-muted/30 px-2.5 py-1.5 mb-1.5 text-foreground border-l-2 border-blue-300">
            <div className="text-xs text-muted-foreground font-semibold mb-0.5">
              {note.visitCaseNo && `Case #${note.visitCaseNo}`}
              {note.operationName && ` — ${note.operationName}`}
            </div>
            {note.fields?.complaint && (
              <div><span className="text-muted-foreground">C: </span>{note.fields.complaint}</div>
            )}
            {note.fields?.diagnosis && (
              <div><span className="text-muted-foreground">D: </span>{note.fields.diagnosis}</div>
            )}
            {note.fields?.treatmentNotes && (
              <div><span className="text-muted-foreground">Tx: </span>{note.fields.treatmentNotes}</div>
            )}
            {note.fields?.examination && (
              <div><span className="text-muted-foreground">Ex: </span>{note.fields.examination}</div>
            )}
            {note.fields?.medication && (
              <div><span className="text-muted-foreground">Rx: </span>{note.fields.medication}</div>
            )}
          </div>
        ) : (
          <div key={note.id} className="whitespace-pre-wrap text-foreground mb-1">
            {note.content}
          </div>
        )
      )}
    </div>
  ));
}
