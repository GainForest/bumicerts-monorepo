import Image from "next/image";
import Link from "next/link";
import { GithubIcon, TwitterIcon, ExternalLinkIcon, LeafIcon, FileTextIcon } from "lucide-react";
import { links } from "@/lib/links";

const FOOTER_LINKS = [
  { href: links.external.gainforest, label: "GainForest",    Icon: LeafIcon,     external: true },
  { href: links.external.docs,       label: "Documentation", Icon: FileTextIcon, external: true },
  { href: links.external.twitter,    label: "Twitter",       Icon: TwitterIcon,  external: true },
  { href: links.external.github,     label: "GitHub",        Icon: GithubIcon,   external: true },
  // { href: "/changelog", label: "Changelog", Icon: FileTextIcon, external: false },
];

export function HomeFooter() {
  return (
    <footer className="max-w-5xl mx-auto px-6 py-16 border-t border-border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/assets/media/images/app-icon.png"
              alt="Bumicerts"
              width={28}
              height={28}
              className="drop-shadow-md"
            />
            <span className="font-serif text-xl font-bold tracking-tight">
              Bumicerts
            </span>
          </div>
          <p
            className="text-muted-foreground text-sm"
            style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
          >
            Connecting communities with funders.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Open infrastructure. Built with GainForest.
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 py-0.5"
            >
              <link.Icon className="h-3.5 w-3.5" />
              <span>{link.label}</span>
              {link.external && <ExternalLinkIcon className="h-3 w-3 opacity-50" />}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} Bumicerts. Open source, community-powered.
      </div>
    </footer>
  );
}
