type HyperlabelRecentActivity = {
  did: string;
  rkey?: string | null;
  uri?: string | null;
  tier: string;
  labeledAt: string | null;
};

type HyperlabelRecentResponse = {
  activities?: HyperlabelRecentActivity[];
};

type ActivityLabelInfo = {
  labelTier: string | null;
  label: {
    tier: string | null;
    labeler: string | null;
    labeledAt: string | null;
    syncedAt: string | null;
  } | null;
};

const LABELER_SOURCE = "local";
const RECENT_TIERS = ["high-quality", "standard", "draft", "likely-test", "pending"] as const;
let recentLabelCache: Promise<Map<string, ActivityLabelInfo>> | null = null;
const tierActivityCache = new Map<string, Promise<HyperlabelRecentActivity[]>>();

async function loadRecentLabelsForTier(tier: string): Promise<HyperlabelRecentActivity[]> {
  const response = await fetch(
    `https://hyperlabel-production.up.railway.app/api/recent?limit=2000&offset=0&tier=${encodeURIComponent(tier)}`,
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as HyperlabelRecentResponse;
  return payload.activities ?? [];
}

export async function fetchHyperlabelActivitiesForTier(tier: string): Promise<
  Array<{
    did: string;
    rkey: string | null;
    uri: string | null;
    tier: string | null;
    labeledAt: string | null;
  }>
> {
  const existing = tierActivityCache.get(tier);
  if (existing) {
    const activities = await existing;
    return activities.map((activity) => ({
      did: activity.did,
      rkey: activity.rkey ?? null,
      uri: activity.uri ?? null,
      tier: activity.tier ?? null,
      labeledAt: activity.labeledAt ?? null,
    }));
  }

  const promise = loadRecentLabelsForTier(tier);
  tierActivityCache.set(tier, promise);
  const activities = await promise;

  return activities.map((activity) => ({
    did: activity.did,
    rkey: activity.rkey ?? null,
    uri: activity.uri ?? null,
    tier: activity.tier ?? null,
    labeledAt: activity.labeledAt ?? null,
  }));
}

async function loadRecentLabels(): Promise<Map<string, ActivityLabelInfo>> {
  const map = new Map<string, ActivityLabelInfo>();

  const tierPayloads = await Promise.all(RECENT_TIERS.map((tier) => loadRecentLabelsForTier(tier)));

  for (const activities of tierPayloads) {
    for (const activity of activities) {
      if (map.has(activity.did)) continue;

      map.set(activity.did, {
        labelTier: activity.tier ?? null,
        label: {
          tier: activity.tier ?? null,
          labeler: LABELER_SOURCE,
          labeledAt: activity.labeledAt ?? null,
          syncedAt: activity.labeledAt ?? null,
        },
      });
    }
  }

  return map;
}

export async function fetchHyperlabelForDid(did: string): Promise<ActivityLabelInfo | null> {
  if (!recentLabelCache) {
    recentLabelCache = loadRecentLabels();
  }

  const map = await recentLabelCache;
  return map.get(did) ?? null;
}
