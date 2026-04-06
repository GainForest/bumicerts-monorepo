"use client";

import { CirclePlusIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { useModal } from "@/components/ui/modal/context";
import {
  SiteEditorModal,
  SiteEditorModalId,
} from "@/components/global/modals/upload/site/editor";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { SiteCard } from "./SiteCard";
import { SitesSkeleton } from "./SitesSkeleton";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SitesClientProps {
  did: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SitesClient({ did }: SitesClientProps) {
  const queryClient = useQueryClient();
  const { pushModal, show } = useModal();

  const { data: sites, isLoading, error } = indexerTrpc.locations.list.useQuery({ did });

  const handleAddSite = () => {
    pushModal(
      {
        id: SiteEditorModalId,
        content: <SiteEditorModal initialData={null} />,
      },
      true
    );
    show();
  };

  if (isLoading) {
    return <SitesSkeleton />;
  }

  if (error) {
    return (
      <Container className="pt-4 pb-8">
        <div className="flex flex-col items-center justify-center h-40 gap-4 text-center">
          <p className="text-destructive text-sm">
            Failed to load sites. Please try refreshing.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void queryClient.invalidateQueries()}

          >
            Retry
          </Button>
        </div>
      </Container>
    );
  }

  const allSites = sites ?? [];

  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          Sites
        </h1>
        <Button
          size="sm"
          className="rounded-full"
          onClick={handleAddSite}
        >
          <CirclePlusIcon />
          Add site
        </Button>
      </div>

      {allSites.length === 0 ? (
        // Empty state
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center justify-center h-48 gap-4 rounded-xl border border-dashed border-border text-center"
        >
          <p
            className="text-xl font-semibold text-muted-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            No sites yet
          </p>
          <p className="text-sm text-muted-foreground">
            Add your first site to get started.
          </p>
          <Button variant="outline" size="sm" onClick={handleAddSite}>
            <CirclePlusIcon />
            Add a site
          </Button>
        </motion.div>
      ) : (
        // Grid of site cards
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSites.map((site) => (
              <SiteCard
                key={site.metadata?.uri ?? site.metadata?.rkey}
                site={site}
                defaultSiteUri={null}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </Container>
  );
}
