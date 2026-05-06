"use client";

import { useMemo } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  Loader2Icon,
  MapPinHouseIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import CountrySelectorModal, {
  CountrySelectorModalId,
} from "@/components/modals/country-selector";
import { useModal } from "@/components/ui/modal/context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries } from "@/lib/countries";
import type { AccountSetupFormState } from "./types";

type OrganizationSetupDetailsPanelProps = {
  did: string;
  form: AccountSetupFormState;
  canSubmit: boolean;
  showAiGeneratedReviewNotice: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  submitError: string | null;
  onBack: () => void;
  onCountryChange: (value: string) => void;
  onStartDateChange: (value: string | null) => void;
  onLongDescriptionChange: (
    value: AccountSetupFormState["longDescription"],
  ) => void;
};

export function OrganizationSetupDetailsPanel({
  did,
  form,
  canSubmit,
  showAiGeneratedReviewNotice,
  isSubmitting,
  submitLabel,
  submitError,
  onBack,
  onCountryChange,
  onStartDateChange,
  onLongDescriptionChange,
}: OrganizationSetupDetailsPanelProps) {
  const { pushModal, show } = useModal();
  const selectedCountry = form.country ? countries[form.country] : null;
  const selectedDate = useMemo(
    () => (form.startDate ? parseISO(form.startDate) : undefined),
    [form.startDate],
  );

  const handleOpenCountrySelector = () => {
    pushModal(
      {
        id: CountrySelectorModalId,
        content: (
          <CountrySelectorModal
            initialCountryCode={form.country}
            onCountryChange={(country) => onCountryChange(country)}
          />
        ),
      },
      true,
    );
    show();
  };

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-foreground">Country</label>

          <button
            type="button"
            className="relative min-h-[72px] rounded-2xl border-2 border-dashed bg-background px-2 py-1 text-left hover:bg-muted"
            onClick={handleOpenCountrySelector}
          >
            {selectedCountry ? (
              <div className="flex h-full flex-col justify-between items-start">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPinHouseIcon className="size-3" />
                  <span>Based in</span>
                </span>
                <span className="absolute top-0 right-2 text-2xl">
                  {selectedCountry.emoji}
                </span>
                <span className="text-sm font-medium">
                  {selectedCountry.name.length > 22
                    ? `${selectedCountry.name.slice(0, 20)}...`
                    : selectedCountry.name}
                </span>
              </div>
            ) : (
              <span className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                Select a Country
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium text-foreground">
            Founding Date
          </label>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="relative min-h-[72px] rounded-2xl border-2 border-dashed bg-background px-2 py-1 text-left hover:bg-muted"
              >
                {selectedDate ? (
                  <div className="flex h-full flex-col justify-between items-start">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarIcon className="size-3" />
                      <span>Founded</span>
                    </span>
                    <span className="self-end text-sm font-medium">
                      {format(selectedDate, "d MMMM,")}
                      <span className="ml-1 text-lg font-bold opacity-40 md:text-2xl">
                        {format(selectedDate, "yyyy")}
                      </span>
                    </span>
                  </div>
                ) : (
                  <span className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    Select a Date
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                captionLayout="dropdown"
                mode="single"
                selected={selectedDate}
                onSelect={(date) =>
                  onStartDateChange(date ? format(date, "yyyy-MM-dd") : null)
                }
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Long description
        </label>

        <LeafletEditor
          content={form.longDescription}
          onChange={onLongDescriptionChange}
          ownerDid={did}
          placeholder="Tell the story behind your organization, the work you do, and why it matters."
          initialHeight={260}
          minHeight={200}
        />
      </div>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      {showAiGeneratedReviewNotice ? (
        <p className="text-center text-muted-foreground">
          Please review and edit the generated content to accurately represent
          your organization before saving.
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" size="lg" variant="outline" onClick={onBack}>
          <ArrowLeftIcon />
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={!canSubmit}
        >
          {submitLabel}
          {isSubmitting ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowRightIcon />
          )}
        </Button>
      </div>
    </section>
  );
}
