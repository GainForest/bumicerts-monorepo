"use client";
import React from "react";
import FormField from "../../../../../../../components/ui/FormField";
import { Button } from "@/components/ui/button";
import {
  UsersIcon,
  ShieldCheckIcon,
  MapIcon,
  PlusCircleIcon,
  Loader2Icon,
  CircleDashedIcon,
  CheckIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useFormStore } from "../../form-store";
import { Checkbox } from "@/components/ui/checkbox";
import useNewBumicertStore from "../../store";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SiteEditorModalId } from "@/components/global/modals/upload/site/editor";
import dynamic from "next/dynamic";
import { computePolygonMetrics, parseAtUri } from "@gainforest/atproto-mutations-next";
import { useSuspenseQuery } from "@tanstack/react-query";
import { links } from "@/lib/links";
import { ContributorRow } from "./ContributorRow";
import { ContributorSelector } from "./ContributorSelector";
import QuerySuspense from "@/components/query-suspense";

import { queries } from "@/lib/graphql/queries/index";
import type { CertifiedLocation } from "@/lib/graphql/queries/index";
import { queryKeys } from "@/lib/query-keys";

const SiteEditorModal = dynamic(
  () =>
    import("@/components/global/modals/upload/site/editor").then((m) => ({
      default: m.SiteEditorModal,
    })),
  { ssr: false }
);

const formatCoordinate = (coordinate: string) => {
  const num = parseFloat(coordinate);
  if (isNaN(num)) return coordinate;
  return num.toFixed(2);
};

const Step3 = () => {
  const { maxStepIndexReached, currentStepIndex } = useNewBumicertStore();
  const shouldShowValidationErrors = currentStepIndex < maxStepIndexReached;

  const [newContributor, setNewContributor] = React.useState("");

  const formValues = useFormStore((state) => state.formValues[2]);
  const errors = useFormStore((state) => state.formErrors[2]);
  const setFormValue = useFormStore((state) => state.setFormValue[2]);
  const { contributors, confirmPermissions, agreeTnc, siteBoundaries } =
    formValues;

  const addContributor = (name: string) => {
    setFormValue("contributors", [...contributors, { id: crypto.randomUUID(), name }]);
  };
  const updateContributor = (id: string, name: string) => {
    setFormValue(
      "contributors",
      contributors.map((c) => (c.id === id ? { ...c, name } : c))
    );
  };
  const removeContributor = (id: string) => {
    setFormValue(
      "contributors",
      contributors.filter((c) => c.id !== id)
    );
  };

  const auth = useAtprotoStore((state) => state.auth);
  const { pushModal, show } = useModal();
  const onAddSite = () => {
    pushModal(
      {
        id: SiteEditorModalId,
        content: <SiteEditorModal initialData={null} />,
      },
      true
    );
    show();
  };

  const {
    data: sitesResponse,
    isPending: isSitesPending,
    isPlaceholderData: isOlderSites,
    error: sitesFetchError,
  } = queries.locations.useQuery({ did: auth.user?.did ?? "" });

  // sitesResponse is CertifiedLocation[] directly
  const sites = sitesResponse as CertifiedLocation[] | undefined;
  const isSitesLoading = isSitesPending || isOlderSites;

  const selectedSitesSet = new Set(siteBoundaries.map((sb) => sb.uri));

  return (
    <div>
      <h1 className="text-2xl font-medium text-muted-foreground">
        Share your contributors and sites.
      </h1>
      <div className="mt-8 flex flex-col gap-2">
        <FormField
          Icon={UsersIcon}
          label="List of Contributors"
          description="Add everyone involved in this project — including your own community or organization and any collaborators. Tip: Start by adding your own group first before listing your partners or supporters."
          error={errors.contributors}
          showError={shouldShowValidationErrors}
          required
          info={`List any individuals or organizations that contributed to this work.`}
        >
          <div className="flex flex-col gap-1">
            <ContributorSelector
              value={newContributor}
              onChange={setNewContributor}
              onClear={() => setNewContributor("")}
              onNext={(val) => {
                const trimmed = (val || newContributor).trim();
                if (trimmed) {
                  addContributor(trimmed);
                  setNewContributor("");
                }
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {contributors.map((c) => (
                <ContributorRow
                  key={c.id}
                  value={c.name}
                  onEdit={(val) => updateContributor(c.id, val)}
                  onRemove={() => removeContributor(c.id)}
                />
              ))}
            </div>
          </div>

        </FormField>

        <FormField
          Icon={MapIcon}
          label="Site Boundaries"
          description="Please upload your site boundary in GeoJSON format so we can visualize your project on the map."
          error={errors.siteBoundaries}
          showError={shouldShowValidationErrors}
          required
          info="Add the boundaries that best represent where the work took place."
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Select the boundaries for this bumicert, or add new ones.
            </span>
            {auth.user?.did && (
              <span className="text-sm text-muted-foreground">
                <Link
                  href={links.upload.sites(auth.user.did)}
                  className="flex items-center text-primary hover:underline"
                >
                  Manage sites <ChevronRightIcon className="size-4" />
                </Link>
              </span>
            )}
          </div>

          <div className="h-40 w-full border border-dashed border-border rounded-lg bg-background/50">
            {isSitesLoading && (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Loader2Icon className="animate-spin text-muted-foreground size-4" />
                <span className="text-sm text-muted-foreground">
                  Loading your sites...
                </span>
              </div>
            )}
            {!isSitesLoading && (
              <>
                {!sites || sites.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      {sitesFetchError
                        ? "Unable to load sites."
                        : "No site found."}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={onAddSite}
                    >
                      <PlusCircleIcon /> Add a site
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                    {sites.map((site) => {
                      const cid = site.metadata?.cid;
                      const uri = site.metadata?.uri;
                      if (!cid || !uri) return null;
                      return (
                        <QuerySuspense
                          key={cid}
                          loadingFallback={
                            <div className="h-12 rounded-md bg-muted animate-pulse"></div>
                          }
                        >
                          <SiteItem
                            site={site}
                            isSelected={selectedSitesSet.has(uri)}
                            onSelectChange={(value) => {
                              if (value) {
                                if (
                                  siteBoundaries.some((sb) => sb.uri === uri)
                                ) {
                                  return;
                                }
                                setFormValue("siteBoundaries", [
                                  ...siteBoundaries,
                                  { cid, uri },
                                ]);
                              } else {
                                setFormValue(
                                  "siteBoundaries",
                                  siteBoundaries.filter((sb) => sb.uri !== uri)
                                );
                              }
                            }}
                          />
                        </QuerySuspense>
                      );
                    })}
                    <Button
                      variant="outline"
                      className="h-auto"
                      onClick={onAddSite}
                    >
                      <PlusCircleIcon /> Add a site
                    </Button>
                  </div>
                )
                }
              </>
            )}
          </div>
        </FormField>

        <FormField
          Icon={ShieldCheckIcon}
          label="Permissions"
          className="text-sm"
          error={errors.confirmPermissions || errors.agreeTnc}
          showError={shouldShowValidationErrors}
        >
          <div className="flex items-start gap-2 mt-2">
            <Checkbox
              id="confirm-permissions"
              className="bg-background size-5"
              checked={confirmPermissions}
              onCheckedChange={(checked) =>
                setFormValue(
                  "confirmPermissions",
                  checked === "indeterminate" ? false : checked
                )
              }
            />
            <label
              className="inline-flex items-center gap-2"
              htmlFor="confirm-permissions"
            >
              I confirm that all listed contributors gave their permission to
              include their work in this Bumicert.
            </label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="agree-tnc"
              className="bg-background size-5"
              checked={agreeTnc}
              onCheckedChange={(checked) =>
                setFormValue(
                  "agreeTnc",
                  checked === "indeterminate" ? false : checked
                )
              }
            />
            <label
              className="inline-flex items-center gap-2"
              htmlFor="agree-tnc"
            >
              I agree to the Terms & Conditions.
            </label>
          </div>
        </FormField>
      </div>
    </div>
  );
};

const SiteItem = ({
  site,
  isSelected,
  onSelectChange,
}: {
  site: CertifiedLocation;
  isSelected: boolean;
  onSelectChange: (value: boolean) => void;
}) => {
  const locationRef = site.record?.location;
  const uri = site.metadata?.uri ?? "";
  // Try to get URL from location data.
  // The indexer resolves every blob reference to a URI before serving it via
  // GraphQL, so we can always read `uri` from whichever variant is present.
  let urlToFetch: string | null = null;

  if (locationRef && typeof locationRef === "object") {
    const loc = locationRef as Record<string, unknown>;
    const $type = loc["$type"] as string | undefined;

    if ($type?.includes("uri")) {
      // URI variant — the value is already a fetchable URL
      urlToFetch = (loc["uri"] as string | undefined) ?? null;
    } else if ($type?.includes("Blob") || $type?.includes("blob")) {
      // Blob variant — indexer injects `uri` into the blob object
      const blob = loc["blob"] as Record<string, unknown> | undefined;
      urlToFetch = (blob?.["uri"] as string | undefined) ?? null;
    }
  }

  const { data: locationData } = useSuspenseQuery({
    queryKey: queryKeys.locationPreview(urlToFetch),
    queryFn: async () => {
      if (!urlToFetch) {
        console.error("Invalid urlToFetch while fetching Location. Location for debugging:", locationRef);
        throw new Error("A valid location could not be found.");
      }
      const response = await fetch(urlToFetch);
      if (!response.ok) {
        throw new Error("Failed to fetch location data");
      }
      const data = await response.json();
      return data as GeoJSON.FeatureCollection;
    },
  });

  const metrics = computePolygonMetrics(locationData);
  const locationValidity =
    metrics.areaHectares && metrics.centroid
      ? {
        valid: true as const,
        area: metrics.areaHectares,
        lat: metrics.centroid.lat,
        lon: metrics.centroid.lon,
      }
      : {
        valid: false as const,
      };

  return (
    <Button
      key={site.metadata?.cid}
      variant={"outline"}
      size="sm"
      className={cn(
        "h-auto flex items-center justify-start px-4 pl-6 py-2 gap-3 overflow-hidden",
        isSelected && "border-primary"
      )}
      onClick={() => onSelectChange(!isSelected)}
    >
      {isSelected ? (
        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <CheckIcon className="size-3 text-white" />
        </div>
      ) : (
          <CircleDashedIcon className="size-5 text-muted-foreground" />
      )}
      <div className="flex flex-col items-start justify-start">
        <span className="text-base font-medium">{site.record?.name ?? "Unnamed Site"}</span>
        <div className="flex items-center gap-1">
          {locationValidity.valid ? (
            <>
              <span className="text-sm text-muted-foreground mr-1">
                {locationValidity.area.toFixed(2)} ha
              </span>
              <span className="text-sm text-muted-foreground">
                {"("}
                {formatCoordinate(locationValidity.lat.toString())}°,{" "}
                {formatCoordinate(locationValidity.lon.toString())}°{")"}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Invalid location
            </span>
          )}
        </div>
      </div>
    </Button>
  );
};

export default Step3;
