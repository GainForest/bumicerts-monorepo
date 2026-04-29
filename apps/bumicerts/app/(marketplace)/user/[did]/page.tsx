import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { blo } from "blo";
import { requirePublicUrl } from "@/lib/url";
import Container from "@/components/ui/container";
import { DonationHistory } from "./_components/DonationHistory";
import { links } from "@/lib/links";

// ── Data fetching ─────────────────────────────────────────────────────────────

interface AtprotoProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

/**
 * Convert a DID to an Ethereum-style address for blo avatar generation.
 */
function didToAddress(did: string): `0x${string}` {
  let hash = 0;
  for (let i = 0; i < did.length; i++) {
    hash = ((hash << 5) - hash + did.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  const address = (hex + hex + hex + hex + hex).slice(0, 40);
  return `0x${address}` as `0x${string}`;
}

async function fetchProfile(did: string): Promise<AtprotoProfile | null> {
  try {
    const url = links.api.getProfile(did);
    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // 5 minutes
    });
    if (!res.ok) return null;
    return (await res.json()) as AtprotoProfile;
  } catch {
    return null;
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}): Promise<Metadata> {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const profile = await fetchProfile(did);
  const displayName = profile?.displayName ?? profile?.handle ?? "User";
  const description = profile?.description ?? `${displayName} on Bumicerts`;
  const userUrl = `${requirePublicUrl()}/user/${encodedDid}`;

  return {
    title: `${displayName} — Bumicerts`,
    description,
    alternates: { canonical: userUrl },
    openGraph: {
      title: displayName,
      description,
      url: userUrl,
      siteName: "Bumicerts",
      type: "profile",
      ...(profile?.avatar
        ? {
            images: [
              {
                url: profile.avatar,
                width: 400,
                height: 400,
                alt: displayName,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary",
      title: displayName,
      description,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const profile = await fetchProfile(did);

  if (!profile) {
    return (
      <Container className="max-w-2xl py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Profile not found
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            We couldn&apos;t find a profile for this user.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Go back home
          </Link>
        </div>
      </Container>
    );
  }

  const displayName = profile.displayName ?? profile.handle;
  const certifiedAppProfileUrl = links.external.certifiedApp.profileUrl(did);

  return (
    <Container className="max-w-5xl py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Profile info */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Avatar and basic info */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative h-24 w-24 rounded-full overflow-hidden bg-muted border-2 border-border">
                <Image
                  src={profile.avatar ?? blo(didToAddress(did))}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {displayName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  @{profile.handle}
                </p>
              </div>

              {/* Bio */}
              {profile.description && (
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {profile.description}
                </p>
              )}

              {/* Link to Certified */}
              <a
                href={certifiedAppProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLinkIcon className="h-3 w-3" />
                View on Certified
              </a>
            </div>

            {/* DID section */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Decentralized ID
              </p>
              <p className="text-xs font-mono text-foreground/70 break-all">
                {did}
              </p>
            </div>

            {/* Quick stats */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Activity
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Member since
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {new Date().toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Donation history */}
        <div className="lg:col-span-2">
          <DonationHistory userDid={did} />
        </div>
      </div>
    </Container>
  );
}
