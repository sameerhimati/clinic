"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { createRoom } from "./actions";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function RoomCreateForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />Add Room
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>New Room</CardTitle></CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            startTransition(async () => {
              try {
                await createRoom(formData);
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Something went wrong");
              }
            });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input name="name" required placeholder="e.g., OP Room 6" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input name="sortOrder" type="number" min="0" defaultValue="0" />
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
