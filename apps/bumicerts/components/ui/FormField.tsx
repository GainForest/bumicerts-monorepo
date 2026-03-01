import { Asterisk, CircleAlert, InfoIcon, LucideIcon } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import QuickTooltip from "./quick-tooltip";

const FormField = ({
  Icon,
  children,
  label,
  inlineEndMessage,
  htmlFor,
  error,
  className,
  showError = true,
  info,
  required = false,
}: {
  label: string;
  Icon: LucideIcon;
  inlineEndMessage?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
  error?: string;
  showError?: boolean;
  className?: string;
  info?: string;
  required?: boolean;
}) => {
  const kebabCaseLabel = label.toLowerCase().replace(/ /g, "-");
  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 p-2 rounded-md transition-colors relative z-10",
        showError && error
          ? "bg-destructive/5"
          : "hover:bg-primary/5 focus-within:bg-primary/5",
        className
      )}
    >
      <div className="flex items-center justify-between w-full">
        <label
          htmlFor={htmlFor ?? kebabCaseLabel}
          className={cn(
            "ml-1 flex items-center gap-1 text-sm transition-colors",
            showError && error
              ? "text-destructive"
              : "text-muted-foreground group-hover:text-foreground group-focus-within:text-foreground"
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </label>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {inlineEndMessage}
          </span>
          {info && (
            <QuickTooltip content={info} asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-transparent hover:bg-transparent h-5 w-5 hidden group-hover:flex group-focus-within:flex items-center justify-center"
              >
                <InfoIcon className="text-muted-foreground" />
              </Button>
            </QuickTooltip>
          )}
          {showError && error && (
            <QuickTooltip content={error} asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-transparent hover:bg-transparent h-5 w-5 flex items-center justify-center"
              >
                <CircleAlert className="text-destructive" />
              </Button>
            </QuickTooltip>
          )}
          {required && (
            <QuickTooltip content={"This field is required"} asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-transparent hover:bg-transparent h-5 w-5 flex items-center justify-center"
              >
                <Asterisk className="text-muted-foreground" />
              </Button>
            </QuickTooltip>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};

export default FormField;
