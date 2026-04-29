"use client";
import React, { useEffect, useState } from "react";
import FormField from "../../../../../../../components/ui/FormField";
import { HandHeartIcon, MessageCircleIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { useFormStore } from "../../form-store";
import useNewBumicertStore from "../../store";
import { Button } from "@/components/ui/button";
import { LeafletEditor } from "@/components/ui/leaflet-editor";
import { BskyRichTextEditor } from "@/components/ui/bsky-richtext-editor";
import { useAtprotoStore } from "@/components/stores/atproto";
import { extractTextFromLinearDocument } from "@/lib/adapters";
import { links } from "@/lib/links";

const Step2 = () => {
  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const formValues = useFormStore((state) => state.formValues[1]);
  const errors = useFormStore((state) => state.formErrors[1]);
  const setFormValue = useFormStore((state) => state.setFormValue[1]);
  const updateErrorsAndCompletion = useFormStore(
    (state) => state.updateErrorsAndCompletion
  );

  // Step 1 values — needed for the AI prompt (title)
  const step1Values = useFormStore((state) => state.formValues[0]);

  const { description, shortDescription, shortDescriptionFacets } = formValues;

  const auth = useAtprotoStore((state) => state.auth);
  const ownerDid = auth.status === "AUTHENTICATED" ? auth.user.did : "";

  const [isGenerating, setIsGenerating] = useState(false);
  const [shortDescriptionEditorKey, setShortDescriptionEditorKey] = useState(0);
  const [editorText, setEditorText] = useState(shortDescription);

  useEffect(() => {
    updateErrorsAndCompletion();
  }, [shouldShowValidationErrors]);

  useEffect(() => {
    // Keep editor stable while typing (avoid remount on each keystroke),
    // but remount when value changes from external sources (e.g. AI generate,
    // hydration) so initialValue is refreshed.
    if (shortDescription === editorText) return;

    setEditorText(shortDescription);
    setShortDescriptionEditorKey((prev) => prev + 1);
  }, [shortDescription, editorText]);

  const handleGenerateShortDescription = async () => {
    const descriptionText = extractTextFromLinearDocument(description).trim();
    if (!descriptionText) return;

    setIsGenerating(true);
    try {
      const res = await fetch(links.bumicert.api.generateShortDescription, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionText,
          title: step1Values.projectName ?? "",
        }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as { shortDescription?: string; success?: boolean };
      if (data.success && data.shortDescription) {
        setFormValue("shortDescription", data.shortDescription);
      }
    } catch {
      // Silently fail — user can just type manually
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate =
    extractTextFromLinearDocument(description).trim().length > 0 && !isGenerating;

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
        required
        info="Tell us what you did and what happened as a result"
      >
        <div className="w-full bg-background rounded-md border border-border overflow-hidden">
          <LeafletEditor
            content={description}
            onChange={(doc) => setFormValue("description", doc)}
            ownerDid={ownerDid}
            placeholder="Describe your impact story..."
            initialHeight={260}
            minHeight={200}
            maxHeight={560}
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
          <div className="w-full rounded-md border border-border bg-background overflow-hidden pr-10">
            <BskyRichTextEditor
              key={shortDescriptionEditorKey}
              initialValue={{ text: shortDescription, facets: shortDescriptionFacets }}
              onChange={(text, facets) => {
                setEditorText(text);
                setFormValue("shortDescription", text);
                setFormValue("shortDescriptionFacets", facets ?? []);
              }}
              placeholder="A quick summary about this bumicert."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canGenerate}
            onClick={handleGenerateShortDescription}
            className="rounded-full absolute right-2 bottom-2"
            title={
              canGenerate
                ? "Generate short description with AI"
                : "Write your impact story first"
            }
          >
            {isGenerating ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon className="fill-current text-muted-foreground" />
            )}
          </Button>
        </div>
      </FormField>
    </div>
  );
};

export default Step2;
