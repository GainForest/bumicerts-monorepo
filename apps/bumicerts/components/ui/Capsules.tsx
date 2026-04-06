"use client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import React from "react";

interface CapsulesProps {
  options: { value: string; label: string }[];
  className?: string;
  selectMultiple?: boolean;
  value?: string | string[];
  onChange?: (value: string[]) => void;
}

const Capsules = ({
  options,
  className,
  selectMultiple = true,
  value,
  onChange,
}: CapsulesProps) => {
  const handleChange = (optionValue: string, checked: boolean) => {
    if (!onChange) return;

    if (selectMultiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (checked) {
        onChange([...currentValues, optionValue]);
      } else {
        onChange(currentValues.filter((v) => v !== optionValue));
      }
    } else {
      onChange(checked ? [optionValue] : []);
    }
  };

  const isChecked = (optionValue: string) => {
    if (selectMultiple) {
      return Array.isArray(value) && value.includes(optionValue);
    } else {
      return value === optionValue;
    }
  };

  return (
    <FieldGroup
      className={cn(
        "flex flex-row flex-wrap gap-2 [--radius:9999rem]",
        className
      )}
    >
      {options.map((option) => (
        <FieldLabel
          htmlFor={option.value}
          key={option.value}
          className="w-fit! cursor-pointer"
        >
          <Field
            orientation="horizontal"
            className="gap-1.5 overflow-hidden px-3! py-1.5! transition-all duration-100 ease-linear group-has-data-[state=checked]/field-label:px-2!"
          >
            <Checkbox
              value={option.value}
              id={option.value}
              checked={isChecked(option.value)}
              onCheckedChange={(checked) =>
                handleChange(
                  option.value,
                  checked === "indeterminate" ? false : checked
                )
              }
              className="-ml-6 -translate-x-1 rounded-full transition-all duration-100 ease-linear data-[state=checked]:ml-0 data-[state=checked]:translate-x-0"
            />
            <FieldTitle>{option.label}</FieldTitle>
          </Field>
        </FieldLabel>
      ))}
    </FieldGroup>
  );
};

export default Capsules;
