"use client";
import React, { useEffect } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  CalendarClockIcon,
  ClubIcon,
  HandHeartIcon,
  ImagePlusIcon,
} from "lucide-react";
import FileInput from "../../../../../../../components/ui/FileInput";
import FormField from "../../../../../../../components/ui/FormField";
import { useFormStore } from "../../form-store";
import Capsules from "../../../../../../../components/ui/Capsules";
import useNewBumicertStore from "../../store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarRange } from "@/components/ui/calendar-range";
import { useNavbarContext } from "@/app/(marketplace)/_components/Navbar/context";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const Step1 = () => {
  const { viewport, openState } = useNavbarContext();

  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const formValues = useFormStore((state) => state.formValues[0]);
  const errors = useFormStore((state) => state.formErrors[0]);
  const setFormValue = useFormStore((state) => state.setFormValue[0]);
  const updateErrorsAndCompletion = useFormStore(
    (state) => state.updateErrorsAndCompletion
  );

  const { projectName, coverImage, workType, projectDateRange, isOngoing } = formValues;
  const [startDate, endDate] = projectDateRange;

  useEffect(() => {
    updateErrorsAndCompletion();
  }, []);

  const handleOngoingChange = (checked: boolean) => {
    setFormValue("isOngoing", checked);
    // When toggling ongoing on, clear the end date; when off, restore today
    setFormValue(
      "projectDateRange",
      checked ? [startDate, null] : [startDate, new Date()]
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        Share your impact at a glance.
      </h1>
      <div className="flex flex-col gap-2 mt-8">
        <div
          className={cn(
            "grid grid-cols-1 gap-2",
            viewport === "desktop" && openState.desktop
              ? "min-[52rem]:grid-cols-[16rem_1fr] lg:grid-cols-1 xl:grid-cols-[16rem_1fr]"
              : "lg:grid-cols-[16rem_1fr]"
          )}
        >
          <FormField
            Icon={ImagePlusIcon}
            label="Cover Image"
            error={errors.coverImage}
            showError={shouldShowValidationErrors}
            info="Choose an image that best represents your work"
            required
          >
            <FileInput
              className="h-80"
              placeholder="Upload or drag and drop an image"
              value={coverImage}
              onFileChange={(file) =>
                setFormValue(
                  "coverImage",
                  file ?? new File([], "cover-image.png")
                )
              }
              supportedFileTypes={[
                "image/jpg",
                "image/jpeg",
                "image/png",
                "image/webp",
              ]}
              maxSizeInMB={10}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <FormField
              Icon={ClubIcon}
              label="Bumicert Title"
              error={errors.projectName}
              showError={shouldShowValidationErrors}
              info="Give your bumicert a clear, descriptive title"
              required
            >
              <InputGroup className="bg-background">
                <InputGroupInput
                  placeholder="My Awesome Bumicert"
                  id="project-title"
                  value={projectName}
                  onChange={(e) => setFormValue("projectName", e.target.value)}
                />
                <InputGroupAddon
                  align="inline-end"
                  className={projectName.length > 50 ? "text-red-500" : ""}
                >
                  {projectName.length}/50
                </InputGroupAddon>
              </InputGroup>
            </FormField>
            <FormField
              Icon={CalendarClockIcon}
              label="Bumicert Date Range"
              className="flex-1"
              error={errors.projectDateRange}
              showError={shouldShowValidationErrors}
              required
              info="Select the period when your work and impact took place"
            >
              <div className="mt-1 flex flex-col gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      id="project-date-range"
                      className="group w-full flex items-center justify-center text-center bg-foreground/2 transition-all duration-300 rounded-md cursor-pointer p-2"
                    >
                      <span
                        className={cn(
                          "text-foreground/20 group-hover:text-foreground/40 text-2xl font-medium",
                          "text-foreground group-hover:text-primary"
                        )}
                      >
                        {format(startDate, "LLL dd, y")} →{" "}
                        {isOngoing || endDate === null
                          ? "Ongoing"
                          : format(endDate, "LLL dd, y")}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <CalendarRange
                      value={[startDate, endDate ?? new Date()]}
                      onValueChange={(value) => {
                        if (!value) return;
                        setFormValue("projectDateRange", [
                          value[0],
                          isOngoing ? null : value[1],
                        ]);
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* Ongoing checkbox */}
                <div className="flex items-center gap-2 px-1">
                  <Checkbox
                    id="is-ongoing"
                    checked={isOngoing}
                    onCheckedChange={(checked) =>
                      handleOngoingChange(checked === true)
                    }
                  />
                  <Label
                    htmlFor="is-ongoing"
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    This work is still ongoing
                  </Label>
                </div>
              </div>
            </FormField>
            <FormField
              Icon={HandHeartIcon}
              label="What kind of work are you doing?"
              className="flex-1"
              error={errors.workType}
              showError={shouldShowValidationErrors}
              required
              info="Feel free to choose more than one"
            >
              <Capsules
                className="mt-1"
                selectMultiple={true}
                value={workType}
                onChange={(value) => setFormValue("workType", value)}
                options={[
                  { value: "Ecological Restoration", label: "Ecological Restoration" },
                  { value: "Agroforestry", label: "Agroforestry" },
                  { value: "Climate Adaptation", label: "Climate Adaptation" },
                  { value: "Biodiversity Monitoring", label: "Biodiversity Monitoring" },
                  { value: "Environmental Education", label: "Environmental Education" },
                  { value: "Indigenous & Local Knowledge", label: "Indigenous & Local Knowledge" },
                  { value: "Environmental Justice", label: "Environmental Justice" },
                ]}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1;
