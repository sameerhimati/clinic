"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FlaskConical, Check } from "lucide-react";

export type LabRateOption = {
  id: number;
  itemName: string;
  rate: number;
  labName: string;
};

export function LabMaterialPicker({
  labRates,
  value,
  onChange,
}: {
  labRates: LabRateOption[];
  value: number | null;
  onChange: (labRateId: number | null, rate: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = labRates.find((lr) => lr.id === value);

  // Group by lab name
  const grouped = labRates.reduce<Record<string, LabRateOption[]>>((acc, lr) => {
    if (!acc[lr.labName]) acc[lr.labName] = [];
    acc[lr.labName].push(lr);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs justify-start font-normal"
        >
          <FlaskConical className="mr-1.5 h-3 w-3 text-muted-foreground" />
          {selected
            ? `${selected.labName} — ${selected.itemName} ₹${selected.rate.toLocaleString("en-IN")}`
            : "Add Lab Work"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search lab materials..." />
          <CommandList>
            <CommandEmpty>No materials found.</CommandEmpty>
            {value && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange(null, 0);
                    setOpen(false);
                  }}
                >
                  Remove lab work
                </CommandItem>
              </CommandGroup>
            )}
            {Object.entries(grouped).map(([labName, rates]) => (
              <CommandGroup key={labName} heading={labName}>
                {rates.map((lr) => (
                  <CommandItem
                    key={lr.id}
                    value={`${lr.labName} ${lr.itemName}`}
                    onSelect={() => {
                      onChange(lr.id, lr.rate);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1">{lr.itemName}</span>
                    <span className="text-muted-foreground ml-2">
                      ₹{lr.rate.toLocaleString("en-IN")}
                    </span>
                    {value === lr.id && (
                      <Check className="ml-2 h-3.5 w-3.5 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
