import { allowedPDSDomains } from "@/lib/config/gainforest-sdk";
import { getEcocertsFromClaimActivities as getBumicertsFromClaimActivities } from "gainforest-sdk/utilities/hypercerts";
import {
  AppGainforestOrganizationInfo,
  OrgHypercertsClaimActivity,
} from "gainforest-sdk/lex-api";
import { GetRecordResponse, Ecocert as Bumicert } from "gainforest-sdk/types";
import { create } from "zustand";
import { Nullable } from "nuqs";

type BaseExploreStoreState = {
  organizations: {
    info: AppGainforestOrganizationInfo.Record;
    repo: ClaimsWithOrgInfo["repo"];
  }[];
  bumicerts: Bumicert[];
};
type ExploreStoreGoodState = BaseExploreStoreState & {
  loading: false;
  error: null;
};
type ExploreStoreBadState = Nullable<BaseExploreStoreState> & {
  loading: false;
  error: Error;
};
type ExploreStoreLoadingState = Nullable<BaseExploreStoreState> & {
  loading: true;
  error: null;
};

export type ExploreStoreState =
  | ExploreStoreGoodState
  | ExploreStoreBadState
  | ExploreStoreLoadingState;

type ClaimsWithOrgInfo = {
  repo: {
    did: string;
  };
  activities: Array<GetRecordResponse<OrgHypercertsClaimActivity.Record>>;
  organizationInfo: AppGainforestOrganizationInfo.Record;
};

export type ExploreStoreActions = {
  update: (data: Array<ClaimsWithOrgInfo> | null | Error) => void;
};

const initialState: ExploreStoreState = {
  organizations: null,
  bumicerts: null,
  loading: true,
  error: null,
};

export const useExploreStore = create<ExploreStoreState & ExploreStoreActions>(
  (set, get) => ({
    ...initialState,
    update: (data) => {
      // data === null => loading state
      if (data === null) {
        set({
          loading: true,
          organizations: get().organizations,
          bumicerts: get().bumicerts,
          error: null,
        });
        return;
      }
      // data is an error => bad state
      if (data instanceof Error) {
        set({
          organizations: get().organizations,
          bumicerts: get().bumicerts,
          loading: false,
          error: data,
        });
        return;
      }
      // data is an array => good state
      if (Array.isArray(data)) {
        const bumicerts = data
          ? getBumicertsFromClaimActivities(data, allowedPDSDomains[0])
          : undefined;
        set({
          organizations: data.map((claim) => ({
            info: claim.organizationInfo,
            repo: claim.repo,
          })),
          bumicerts: bumicerts ?? [],
          loading: false,
          error: null,
        });
        return;
      }
    },
  })
);
