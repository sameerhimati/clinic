"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deletePatient } from "../actions";

export function DeletePatientButton({
  patientId,
  patientName,
}: {
  patientId: number;
  patientName: string;
}) {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={async () => {
        if (confirm(`Delete patient "${patientName}"? This will delete all their visits and receipts.`)) {
          await deletePatient(patientId);
        }
      }}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </Button>
  );
}
