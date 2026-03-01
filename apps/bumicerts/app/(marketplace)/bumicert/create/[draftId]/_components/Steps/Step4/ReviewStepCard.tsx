import { Button } from "@/components/ui/button";
import React from "react";
import { ArrowRightIcon, CircleCheck } from "lucide-react";
import CircularProgressBar from "@/components/circular-progressbar";
import z from "zod";

const ReviewStepCard = <
  K extends string,
  T extends z.ZodObject<Record<K, z.ZodTypeAny>>,
>({
  title,
  percentage,
  onEdit,
  children,
  schema,
  errors,
}: {
  title: string;
  percentage?: number;
  onEdit?: () => void;
  children?: React.ReactNode;
  schema: T;
  errors: Partial<Record<K, string>>;
}) => {
  const errorKeys = Object.keys(errors) as K[];
  const errorKeysWithRequired = errorKeys.filter(
    (key) => errors[key] === "Required"
  );
  const errorKeysWithoutRequired = errorKeys.filter(
    (key) => errors[key] !== "Required"
  );
  const hasErrors =
    errorKeysWithRequired.length > 0 || errorKeysWithoutRequired.length > 0;
  return (
    <div className="rounded-xl border border-primary/10 shadow-lg overflow-hidden bg-primary/10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between text-primary px-2 py-1">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {onEdit !== undefined && (
            <Button
              className="h-6 rounded-full -mr-1"
              variant={"ghost"}
              size={"sm"}
              onClick={onEdit}
            >
              Edit
              <ArrowRightIcon />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-background flex-1 rounded-xl">
        <div className="m-2 flex flex-col bg-muted/50 rounded-lg shadow-sm">
          {hasErrors && (
            <div className="bg-red-500/5 rounded-lg p-2 border border-red-500/20 shadow-sm flex flex-col gap-1">
              {/* Missing Fields */}
              {errorKeysWithRequired.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-destructive">
                    The following fields are missing:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {errorKeysWithRequired.length > 0 &&
                      errorKeysWithRequired.map((key) => {
                        const description = schema.shape[key].description;
                        return (
                          <span
                            className="text-xs text-foreground bg-red-500/5 px-1.5 py-1 rounded-md"
                            key={key}
                          >
                            {description}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}
              {/* Encountered Errors */}
              {errorKeysWithoutRequired.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-destructive">
                    The following fields encountered errors:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    {errorKeysWithoutRequired.length > 0 &&
                      errorKeysWithoutRequired.map((key) => {
                        const description = schema.shape[key].description;
                        return (
                          <span
                            className="text-xs text-foreground bg-red-500/5 px-1.5 py-1 rounded-md"
                            key={key}
                          >
                            {description}
                          </span>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-2 gap-2">
            <span className="text-sm font-medium text-foreground">
              {hasErrors ?
                "Please fix these issues to continue."
              : "All the fields are filled correctly."}
            </span>
            <div className="flex items-center gap-1">
              {hasErrors && percentage !== undefined ?
                <CircularProgressBar
                  size={28}
                  value={percentage}
                  text={`${percentage}%`}
                  textSize={0.4}
                />
              : <CircleCheck className="size-6 text-primary" />}
              {hasErrors && (
                <Button
                  className="rounded-full"
                  variant={"outline"}
                  size={"sm"}
                  onClick={onEdit}
                >
                  Fix
                  <ArrowRightIcon />
                </Button>
              )}
            </div>
          </div>
        </div>
        {children && <div className="px-4 py-1 divide-y">{children}</div>}
      </div>
    </div>
  );
};

export default ReviewStepCard;
