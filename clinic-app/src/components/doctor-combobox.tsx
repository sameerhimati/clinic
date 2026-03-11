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
import { Check, ChevronsUpDown } from "lucide-react";
import { toTitleCase } from "@/lib/format";

export function DoctorCombobox({
  doctors,
  value,
  onChange,
  placeholder = "Select doctor...",
  allowEmpty = true,
  emptyLabel = "All Doctors",
  name,
  required,
  className,
}: {
  doctors: { id: number; name: string }[];
  value: number | string | undefined;
  onChange: (doctorId: number | undefined) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  name?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const numValue = typeof value === "string" ? (value ? parseInt(value) : undefined) : value;
  const selected = doctors.find((d) => d.id === numValue);

  return (
    <>
      {name && <input type="hidden" name={name} value={numValue || ""} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`justify-between font-normal ${className || "w-full h-9 text-sm"}`}
          >
            <span className="truncate">
              {selected ? toTitleCase(selected.name) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search doctors..." />
            <CommandList>
              <CommandEmpty>No doctors found.</CommandEmpty>
              <CommandGroup>
                {allowEmpty && (
                  <CommandItem
                    value="__empty__"
                    onSelect={() => {
                      onChange(undefined);
                      setOpen(false);
                    }}
                  >
                    <span className="text-muted-foreground">{emptyLabel}</span>
                    {!numValue && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                )}
                {doctors.map((d) => (
                  <CommandItem
                    key={d.id}
                    value={d.name}
                    onSelect={() => {
                      onChange(d.id);
                      setOpen(false);
                    }}
                  >
                    {toTitleCase(d.name)}
                    {numValue === d.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
