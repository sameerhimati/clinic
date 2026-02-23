"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { updatePatientDiseases } from "@/app/(main)/patients/actions";
import { useRouter } from "next/navigation";

interface Disease {
  id: number;
  name: string;
}

interface MedicalHistoryEditorProps {
  patientId: number;
  currentDiseaseIds: number[];
  allDiseases: Disease[];
  canEdit: boolean;
  diseaseNames: string[];
}

export function MedicalHistoryEditor({
  patientId,
  currentDiseaseIds,
  allDiseases,
  canEdit,
  diseaseNames,
}: MedicalHistoryEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<number[]>(currentDiseaseIds);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!editing) {
    if (diseaseNames.length === 0 && !canEdit) return null;

    return (
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-sm text-muted-foreground font-medium">Medical History</div>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setSelected(currentDiseaseIds);
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
        {diseaseNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {diseaseNames.map((name) => (
              <Badge key={name} variant="destructive">{name}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None recorded</p>
        )}
      </div>
    );
  }

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function handleSave() {
    startTransition(async () => {
      await updatePatientDiseases(patientId, selected);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-sm text-muted-foreground font-medium">Medical History</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600"
          onClick={handleSave}
          disabled={isPending}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setEditing(false)}
          disabled={isPending}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {allDiseases.map((disease) => (
          <label
            key={disease.id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(disease.id)}
              onChange={() => toggle(disease.id)}
              className="rounded border-gray-300"
            />
            {disease.name}
          </label>
        ))}
      </div>
    </div>
  );
}
