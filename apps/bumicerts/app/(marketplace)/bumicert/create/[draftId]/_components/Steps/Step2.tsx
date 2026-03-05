"use client";
import React, { useEffect } from "react";
import FormField from "../../../../../../../components/ui/FormField";
import { Textarea } from "@/components/ui/textarea";
import { HandHeartIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";
import { useFormStore } from "../../form-store";
import useNewBumicertStore from "../../store";
import { Button } from "@/components/ui/button";
import QuickTooltip from "@/components/ui/quick-tooltip";
import dynamic from 'next/dynamic';
import { richTextEditorClassNames } from "@/lib/richtext";
const DynamicRichTextEditor = dynamic(
  () => import('bsky-richtext-react').then((mod) => mod.RichTextEditor),
  { ssr: false }  // <-- This is critical!
);
const Step2 = () => {
  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const formValues = useFormStore((state) => state.formValues[1]);
  const errors = useFormStore((state) => state.formErrors[1]);
  const setFormValue = useFormStore((state) => state.setFormValue[1]);
  const updateErrorsAndCompletion = useFormStore(
    (state) => state.updateErrorsAndCompletion
  );
  const { description, descriptionFacets, shortDescription } = formValues;

  useEffect(() => {
    updateErrorsAndCompletion();
  }, [shouldShowValidationErrors]);


  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        Share your impact story.
      </h1>
      <FormField
        Icon={HandHeartIcon}
        label="Your Impact Story"
        className="mt-8"
        description="Tell us about your impact — what changed, who was involved, and how it's helping. Take your time. Your story helps inspire others and verify your work."
        error={errors.description}
        showError={shouldShowValidationErrors}
        inlineEndMessage={`${description.length}/30000`}
        required
        info="Tell us what you did and what happened as a result"
      >
        <div className="w-full bg-background rounded-md border border-border overflow-hidden p-3">
          <DynamicRichTextEditor
            initialValue={{ text: description, facets: descriptionFacets }}
            onChange={(record) => {
              setFormValue("description", record.text);
              setFormValue("descriptionFacets", record.facets);
            }}
            placeholder="Describe your impact story..."
            classNames={richTextEditorClassNames}
            className="min-h-[200px]"
          />
        </div>
      </FormField>
      <FormField
        Icon={MessageCircleIcon}
        label="Short Description"
        className="mt-4"
        description="A short description of your impact story. This will be used as the short description of the bumicert."
        error={errors.shortDescription}
        showError={shouldShowValidationErrors}
        inlineEndMessage={`${shortDescription.length}/3000`}
        required
        info="Summarize your work and its results in a few lines"
      >
        <div className="w-full relative">
          <Textarea
            id="short-description"
            placeholder="A quick summary about this project."
            value={shortDescription}
            onChange={(e) => setFormValue("shortDescription", e.target.value)}
            className="min-h-24 bg-background"
          />
          <QuickTooltip content="AI coming soon." asChild>
            <Button
              variant={"outline"}
              size={"icon-sm"}
              className="rounded-full absolute right-2 bottom-2"
            >
              <SparklesIcon className="fill-current text-muted-foreground" />
            </Button>
          </QuickTooltip>
        </div>
      </FormField>
    </div>
  );
};

export default Step2;
