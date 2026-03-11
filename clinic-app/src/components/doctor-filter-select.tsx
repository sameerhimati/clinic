"use client";

import { useState } from "react";
import { DoctorCombobox } from "./doctor-combobox";

export function DoctorFilterSelect({
  doctors,
  defaultValue,
  name = "doctorId",
  placeholder = "All Doctors",
}: {
  doctors: { id: number; name: string }[];
  defaultValue?: string;
  name?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState<number | undefined>(
    defaultValue ? parseInt(defaultValue) : undefined
  );

  return (
    <DoctorCombobox
      doctors={doctors}
      value={value}
      onChange={setValue}
      name={name}
      placeholder={placeholder}
      className="h-9 w-[200px] text-sm"
    />
  );
}
