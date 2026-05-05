import Link from "next/link";
import Container from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

export function AccountOnboardingRequired() {
  return (
    <Container className="max-w-2xl py-16">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Onboarding required
          </h1>
          <p className="text-sm text-muted-foreground">
            You are signed in, but your Bumicerts account is not set up yet.
            Complete onboarding to continue.
          </p>
        </div>

        <Button asChild>
          <Link href={links.manage.home}>Start onboarding</Link>
        </Button>
      </div>
    </Container>
  );
}
