import { clientEnv } from "@/lib/env/client";

type DidDynamicLink = (did?: string) => string;
const didCatcher = (callback: (did: string) => string): DidDynamicLink => {
  return (did) => (did === undefined ? "#" : callback(did));
};

const DEFAULT_GREEN_GLOBE_PREVIEW_BASE_URL = "https://gainforest.app";

const GREEN_GLOBE_PREVIEW_BASE_URL =
  clientEnv.NEXT_PUBLIC_GREEN_GLOBE_URL?.trim().replace(/\/$/, "") ??
  DEFAULT_GREEN_GLOBE_PREVIEW_BASE_URL;

export const links = {
  root: "/",
  home: "/home",
  onboarding: "/onboarding",
  leaderboard: "/leaderboard",
  dashboard: "/dashboard",
  checkout: "/checkout",
  myOrganization: (did?: string) =>
    did ? `/organization/${encodeURIComponent(did)}` : "/organization",
  allOrganizations: "/organization/all",

  /** Tab routes for an organization profile page. */
  organization: {
    home: (did: string) => `/organization/${encodeURIComponent(did)}`,
    bumicerts: (did: string) =>
      `/organization/${encodeURIComponent(did)}/bumicerts`,
  },
  manage: {
    home: "/upload",
    edit: "/upload?mode=edit",
    sites: "/upload/sites",
    audio: "/upload/audio",
    bumicerts: "/upload/bumicerts",
    trees: "/upload/trees",
    treesManage: "/upload/trees/manage",
    treesManageFiltered: (options?: {
      dataset?: string | null;
    }) => {
      const searchParams = new URLSearchParams();

      if (options?.dataset) {
        searchParams.set("dataset", options.dataset);
      }

      const queryString = searchParams.toString();
      return `/upload/trees/manage${queryString ? `?${queryString}` : ""}`;
    },
  },
  user: didCatcher((did) => `/user/${did}`),
  explore: "/explore",
  bumicert: {
    create: "/bumicert/create",
    createWithDraftId: (draftId: string) => `/bumicert/create/${draftId}`,
    // View a bumicert by either:
    // 1. Full id (did-rkey format) - for backward compatibility
    // 2. Separate did and rkey parameters
    view: (didOrId: string, rkey?: string) => {
      if (rkey) {
        // Two parameters: did and rkey
        return `/bumicert/${encodeURIComponent(didOrId)}-${encodeURIComponent(rkey)}`;
      }
      // One parameter: already formatted id (did-rkey)
      return `/bumicert/${didOrId}`;
    },
    api: {
      generateShortDescription:
        "/bumicert/create/api/generate-short-description",
    },
  },
  external: {
    certifiedApp: {
      profileUrl: didCatcher((did) => `https://certified.app/profile/${did}`),
    },
    polygonsAppUrl: (
      options?:
        | {
            mode: "view";
            params: {
              certifiedLocationRecordUri?: `at://did:plc:${string}/app.certified.location/${string}`;
            };
          }
        | {
            mode: "draw";
          },
    ) => {
      const baseUrl = "https://polygons-gainforest.vercel.app";
      if (options) {
        // Filter params because URLSearchParams produces the param value as "undefined" rather than omitting it.
        const filteredParams =
          "params" in options && options.params
            ? Object.fromEntries(
                Object.entries(options.params).filter(
                  ([, v]) => v !== undefined,
                ),
              )
            : undefined;
        const searchParams = new URLSearchParams(filteredParams);
        const paramsString = searchParams.toString();
        return `${baseUrl}/${options.mode}${paramsString === "" ? "" : `?${paramsString}`}`;
      }
      return baseUrl;
    },
    basescan: (txHash: string) => `https://basescan.org/tx/${txHash}`,
    github: "https://github.com/GainForest/bumicerts-monorepo",
    twitter: "https://www.x.com/GainForestNow",
    gainforest: "https://www.gainforest.earth",
    greenGlobePreviewBase: GREEN_GLOBE_PREVIEW_BASE_URL,
    greenGlobeTreePreview: (
      did: string,
      options?: {
        treeUri?: string | null;
        datasetRef?: string | null;
      },
    ) => {
      const query = new URLSearchParams();

      if (options?.treeUri) {
        query.set("tree-uri", options.treeUri);
      }
      if (options?.datasetRef) {
        query.set("dataset-ref", options.datasetRef);
      }

      const queryString = query.toString();
      const basePath = `${GREEN_GLOBE_PREVIEW_BASE_URL}/embed/${encodeURIComponent(did)}`;
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    docs: "https://docs.fund.gainforest.app/",
    gbifPublisher:
      "https://www.gbif.org/publisher/c02486e8-eb54-4e94-81d8-1038cc58e208",
  },
  assets: {
    treeDataTemplate: "/templates/tree-data-template.csv",
  },
  api: {
    onboarding: {
      sendVerificationCode: "/onboarding/api/send-verification-code",
      verifyEmailCode: "/onboarding/api/verify-email-code",
      generateShortDescription: "/onboarding/api/generate-short-description",
      fetchBrandInfo: "/onboarding/api/fetch-brand-info",
      onboard: "/onboarding/api/onboard",
    },
    aws: {
      upload: {
        image: "/api/aws/upload/image",
      },
    },
    searchActors: (q: string, limit: number = 5) =>
      `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(q)}&limit=${limit}`,
    getProfile: (actor: string) =>
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`,
    drafts: {
      bumicert: {
        get: (params?: {
          draftIds?: number[];
          orderBy?: "created_at" | "updated_at";
          orderDirection?: "asc" | "desc";
        }) => {
          const searchParams = new URLSearchParams();
          if (params?.draftIds) {
            searchParams.set("draftIds", JSON.stringify(params.draftIds));
          }
          if (params?.orderBy) {
            searchParams.set("orderBy", params.orderBy);
          }
          if (params?.orderDirection) {
            searchParams.set("orderDirection", params.orderDirection);
          }
          const queryString = searchParams.toString();
          return `/api/supabase/drafts/bumicert${
            queryString ? `?${queryString}` : ""
          }`;
        },
        post: "/api/supabase/drafts/bumicert",
        delete: "/api/supabase/drafts/bumicert",
      },
    },
  },
};
