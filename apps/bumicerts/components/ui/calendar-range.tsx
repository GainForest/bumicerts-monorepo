"use client";

import * as React from "react";
import { LightbulbIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";

export interface CalendarRangeProps {
  value?: [Date, Date] | null;
  onValueChange?: (value: [Date, Date] | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function CalendarRange({ value, onValueChange }: CalendarRangeProps) {
  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const newValue: [Date, Date] = [range.from, range.to];
      onValueChange?.(newValue);
    } else {
      onValueChange?.(null);
    }
    // Never auto-close the popover - let user close it manually
  };

  return (
    <>
      <Calendar
        className="h-[340px] w-full"
        mode="range"
        defaultMonth={value?.[0]}
        selected={
          value
            ? {
                from: value[0],
                to: value[1],
              }
            : undefined
        }
        onSelect={handleSelect}
        numberOfMonths={2}
        captionLayout="dropdown"
      />
      <div className="w-full flex items-center text-center justify-center text-sm text-primary mb-2">
        <span className="px-2 py-1 bg-muted rounded-lg flex items-center gap-2">
          <LightbulbIcon className="size-4" />
          Double click a date to change the start date.
        </span>
      </div>
    </>
  );
}
