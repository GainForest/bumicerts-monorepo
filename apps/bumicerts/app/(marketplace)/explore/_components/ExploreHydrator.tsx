"use client";
import { trpcApi } from "@/components/providers/TrpcProvider";
import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import React, { useEffect } from "react";
import { useExploreStore } from "../store";

const ExploreHydrator = ({ children }: { children?: React.ReactNode }) => {
  const { data, isLoading, error, isPlaceholderData } =
    trpcApi.hypercerts.claim.activity.getAllAcrossOrgs.useQuery({
      pdsDomain: allowedPDSDomains[0],
    });
  const update = useExploreStore((state) => state.update);

  useEffect(() => {
    if (isPlaceholderData) return;
    if (isLoading || data === undefined) {
      update(null);
      return;
    }
    if (error) {
      update(new Error(error.message));
      return;
    }
    update(data);
  }, [data, isLoading, error, isPlaceholderData]);

  return children;
};

export default ExploreHydrator;
