"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { createLab } from "./actions";
import { useState } from "react";

export function LabCreateForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />Add Lab
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>New Lab</CardTitle></CardHeader>
      <CardContent>
        <form action={createLab} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Lab Name <span className="text-destructive">*</span></Label>
            <Input name="name" required placeholder="e.g., PRECISION DENTAL LAB" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input name="contactPhone" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input name="contactEmail" type="email" />
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit">Create</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
