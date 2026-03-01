type DidDynamicLink = (did?: string) => string;
const didCatcher = (callback: (did: string) => string): DidDynamicLink => {
  return (did) => (did === undefined ? "#" : callback(did));
};

export const links = {
  home: "/home",
  myOrganization: (did?: string) =>
    did ? `/organization/${did}` : "/organization",
  allOrganizations: "/organization/all",
  upload: {
    organization: didCatcher((did) => `/upload/organization/${did}`),
    projects: didCatcher((did) => `/upload/organization/${did}/projects`),
    sites: didCatcher((did) => `/upload/organization/${did}/sites`),
    layers: didCatcher((did) => `/upload/organization/${did}/layers`),
    audio: didCatcher((did) => `/upload/organization/${did}/audio`),
    bumicerts: didCatcher((did) => `/upload/organization/${did}/bumicerts`),
  },
  user: didCatcher((did) => `/user/${did}`),
  explore: "/explore",
  bumicert: {
    create: "/bumicert/create",
    createWithDraftId: (draftId: string) => `/bumicert/create/${draftId}`,
    view: (bumicertId: string) => `/bumicert/${bumicertId}`,
  },
  api: {
    onboarding: {
      sendInviteEmail: "/onboarding/api/send-invite-email",
      verifyInviteCode: "/onboarding/api/verify-invite-code",
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
