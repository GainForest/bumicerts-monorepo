import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Get Started - Create Your Organization",
  description:
    "Join Bumicerts and create your organization profile. Start funding impactful regenerative projects and contribute to climate action.",
  openGraph: {
    title: "Get Started with Bumicerts",
    description:
      "Create your organization profile and start funding impactful regenerative projects.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      className="min-h-screen w-full bg-background"
      role="main"
      aria-label="Onboarding"
    >
      <header className="w-full px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>
      </header>
      {children}
    </main>
  );
}
