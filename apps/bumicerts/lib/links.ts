type DidDynamicLink = (did?: string) => string;
const didCatcher = (callback: (did: string) => string): DidDynamicLink => {
  return (did) => (did === undefined ? "#" : callback(did));
};

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
    home:      (did: string) => `/organization/${encodeURIComponent(did)}`,
    bumicerts: (did: string) => `/organization/${encodeURIComponent(did)}/bumicerts`,
  },
  upload: {
    home: "/upload",
    edit: "/upload?mode=edit",
    sites: "/upload/sites",
    audio: "/upload/audio",
    bumicerts: "/upload/bumicerts",
    trees: "/upload/trees",
    treesManage: "/upload/trees/manage",
  },
  user: didCatcher((did) => `/user/${did}`),
  explore: "/explore",
  bumicert: {
    create: "/bumicert/create",
    createWithDraftId: (draftId: string) => `/bumicert/create/${draftId}`,
    view: (bumicertId: string) => `/bumicert/${bumicertId}`,
    api: {
      generateShortDescription: "/bumicert/create/api/generate-short-description",
    },
  },
  external: {
    /**
     * Legacy Gainforest map viewer with a GeoJSON shapefile loaded.
     * Pass the resolved blob URL as `shapefileUrl`.
     */
    gainforestMapViewer: (shapefileUrl: string) =>
      `https://legacy.gainforest.app/?shapefile=${encodeURIComponent(shapefileUrl)}&showUI=false`,
    basescan: (txHash: string) => `https://basescan.org/tx/${txHash}`,
    github: "https://github.com/GainForest/bumicerts-monorepo",
    twitter: "https://www.x.com/GainForestNow",
    gainforest: "https://www.gainforest.earth",
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
