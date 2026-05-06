import { clientEnv } from "./env/client";

type DidDynamicLink = (did?: string) => string;
const didCatcher = (callback: (did: string) => string): DidDynamicLink => {
  return (did) => (did === undefined ? "#" : callback(did));
};

const DEFAULT_GREEN_GLOBE_PREVIEW_BASE_URL = "https://gainforest.app";
const BUMICERT_CREATE_PATH = "/bumicert/create";
const HYPERLABEL_BASE_URL = "https://hyperlabel-production.up.railway.app";

const GREEN_GLOBE_PREVIEW_BASE_URL =
  clientEnv.NEXT_PUBLIC_GREEN_GLOBE_URL?.trim().replace(/\/$/, "") ??
  DEFAULT_GREEN_GLOBE_PREVIEW_BASE_URL;

export const links = {
  root: "/",
  home: "/home",
  leaderboard: "/leaderboard",
  dashboard: "/dashboard",
  checkout: "/checkout",
  myOrganization: (did?: string) =>
    did ? `/account/${encodeURIComponent(did)}` : "/account",
  allOrganizations: "/organizations",

  account: {
    self: "/account",
    byDid: (did: string) => `/account/${encodeURIComponent(did)}`,
    bumicerts: (did: string) =>
      `/account/${encodeURIComponent(did)}/bumicerts`,
    donations: (did: string) =>
      `/account/${encodeURIComponent(did)}/donations`,
  },

  manage: {
    home: "/upload",
    edit: "/upload?mode=edit",
    onboardUser: "/upload?mode=onboard-user",
    onboardOrganization: "/upload?mode=onboard-org",
    sites: "/upload/sites",
    audio: "/upload/audio",
    bumicerts: BUMICERT_CREATE_PATH,
    trees: "/upload/trees",
    treesUpload: "/upload/trees?mode=upload",
    treesFiltered: (options?: {
      dataset?: string | null;
    }) => {
      const searchParams = new URLSearchParams();

      if (options?.dataset) {
        searchParams.set("dataset", options.dataset);
      }

      const queryString = searchParams.toString();
      return `/upload/trees${queryString ? `?${queryString}` : ""}`;
    },
  },
  explore: "/explore",
  bumicert: {
    create: BUMICERT_CREATE_PATH,
    createWithDraftId: (draftId: string) => `${BUMICERT_CREATE_PATH}/${draftId}`,
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
        `${BUMICERT_CREATE_PATH}/api/generate-short-description`,
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
    share: {
      x: (text: string) =>
        `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
      bluesky: (text: string) =>
        `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
      telegram: (text: string) =>
        `tg://msg?text=${encodeURIComponent(text)}`,
    },
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
    hyperlabel: {
      baseUrl: HYPERLABEL_BASE_URL,
      recent: (options: { limit: number; offset: number; tier: string }) => {
        const searchParams = new URLSearchParams({
          limit: String(options.limit),
          offset: String(options.offset),
          tier: options.tier,
        });

        return `${HYPERLABEL_BASE_URL}/api/recent?${searchParams.toString()}`;
      },
    },
  },
  public: {
    icon: "/assets/media/images/app-icon.png",
  },
  assets: {
    treeDataTemplate: "/templates/tree-data-template.csv",
    treeDataBasicTemplate: "/templates/tree-data-basic-xlsform.xlsx",
    treeDataDetailedTemplate: "/templates/tree-data-detailed-xlsform.xlsx",
  },
  api: {
    atproto: {
      ensureProfileRecords: "/api/atproto/ensure-profile-records",
    },
    brand: {
      fetchInfo: "/api/brand/fetch-info",
    },
    upload: {
      trees: {
        datasets: "/api/upload/trees/datasets",
      },
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
