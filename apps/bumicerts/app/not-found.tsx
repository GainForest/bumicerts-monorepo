import Link from "next/link";
import { links } from "@/lib/links";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1
        className="text-7xl font-light tracking-[-0.02em]"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        404
      </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        This page doesn't exist. Maybe it was moved, or maybe it never existed at all.
      </p>
      <Link
        href={links.home}
        className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
