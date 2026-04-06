import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgData, type GraphQLOrgInfoItem } from "./_data";
import { orgInfoToOrganizationData } from "@/lib/adapters";
import { OrgHero } from "./_components/OrgHero";
import { OrgTabBar } from "./_components/OrgTabBar";
import { OrgSetupPage } from "./_components/OrgSetupPage";
import ErrorPage from "@/components/error-page";
import Container from "@/components/ui/container";

/**
 * Shared layout for all /organization/[did] sub-routes.
 *
 * Rendering the OrgHero and OrgTabBar here — rather than in each page.tsx —
 * means Next.js preserves them across tab navigations. The hero animates once
 * on first load and stays mounted as the content slot (children) swaps.
 *
 * JSON-LD structured data and <title> stay in each page.tsx via generateMetadata.
 */
export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const [{ data, error }, session] = await Promise.all([
    getOrgData(did),
    auth.session.getSession(),
  ]);

  if (error) {
    console.error("[OrganizationLayout] Error fetching org", did, error);
    return (
      <Container className="pt-4">
        <ErrorPage
          title="Couldn't load this organization"
          description="We had trouble fetching this organization's data. Please try again."
          error={error}
        />
      </Container>
    );
  }

  const orgInfo = data?.org as GraphQLOrgInfoItem | undefined;
  const isOwner = session.isLoggedIn && session.did === did;

  // Own org but no profile yet — show setup prompt, no tabs
  if (!orgInfo && isOwner) {
    return (
      <Container className="pt-4">
        <OrgSetupPage did={did} />
      </Container>
    );
  }

  if (!orgInfo) notFound();

  const organization = orgInfoToOrganizationData(orgInfo, 0);

  return (
    <main className="w-full">
      <Container className="pt-4 pb-8">
        {/* Hero — persists across tab changes; animates only on first mount */}
        <OrgHero organization={organization} showEditButton={isOwner} />

        {/* Tab bar — also persists, sliding indicator springs between tabs */}
        <OrgTabBar did={organization.did} />

        {/* Content slot — swaps on tab change without remounting the hero */}
        {children}
      </Container>
    </main>
  );
}
