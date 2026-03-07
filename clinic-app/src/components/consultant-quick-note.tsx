"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { saveQuickNote } from "@/app/(main)/visits/[id]/examine/actions";
import { useRouter } from "next/navigation";

export function ConsultantQuickNote({ visitId }: { visitId: number }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!note.trim()) return;
    startTransition(async () => {
      try {
        await saveQuickNote(visitId, note);
        toast.success("Note added");
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add note");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Quick Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Add a clinical note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={isPending || !note.trim()}
            size="sm"
          >
            {isPending ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
