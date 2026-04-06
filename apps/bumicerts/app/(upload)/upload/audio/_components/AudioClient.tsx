"use client";

import { useCallback } from "react";
import {
  ChevronLeftIcon,
  CirclePlusIcon,
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryState, parseAsString, parseAsStringLiteral } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Container from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { AudioCard } from "./AudioCard";
import { AudioEditor } from "./AudioEditor";
import { AudioSkeleton } from "./AudioSkeleton";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_OPTIONS = ["grid", "list", "add", "edit"] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface AudioClientProps {
  did: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AudioClient({ did }: AudioClientProps) {
  // ── URL state ───────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );
  const [viewMode, setViewMode] = useQueryState(
    "view",
    parseAsStringLiteral(VIEW_OPTIONS).withDefault("grid")
  );
  const [editRkey, setEditRkey] = useQueryState(
    "editRkey",
    parseAsString.withDefault("")
  );

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: recordings, isLoading } = indexerTrpc.audio.list.useQuery({ did });
  const allRecordings = recordings ?? [];

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredRecordings = allRecordings.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (r.record?.name ?? "").toLowerCase();
    const desc = (() => {
      const d = r.record?.description;
      if (!d || typeof d !== "object") return "";
      return String((d as Record<string, unknown>)["text"] ?? "").toLowerCase();
    })();
    return name.includes(q) || desc.includes(q);
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleEdit = useCallback(
    (rkey: string) => {
      void setEditRkey(rkey);
      void setViewMode("edit");
    },
    [setEditRkey, setViewMode]
  );

  const handleBackToList = useCallback(() => {
    void setViewMode("grid");
    void setEditRkey(null);
  }, [setViewMode, setEditRkey]);

  // ── Render states ───────────────────────────────────────────────────────────

  if (isLoading) {
    return <AudioSkeleton />;
  }

  const isEditorMode = viewMode === "add" || viewMode === "edit";

  const editTarget =
    viewMode === "edit"
      ? allRecordings.find((r) => r.metadata?.rkey === editRkey) ?? null
      : null;

  return (
    <Container className="pt-4 pb-8 space-y-6">
      {/* Header — hidden in editor mode */}
      {!isEditorMode && (
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Audio Recordings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload and manage audio recordings for your organisation.
          </p>
        </div>
      )}

      {/* Editor mode */}
      {isEditorMode && (
        <>
          <Button variant="ghost" onClick={handleBackToList} className="-ml-2">
            <ChevronLeftIcon />
            Back
          </Button>
          <AudioEditor
            mode={viewMode as "add" | "edit"}
            initialData={editTarget}
            onClose={handleBackToList}
          />
        </>
      )}

      {/* Toolbar — hidden in editor mode */}
      {!isEditorMode && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recordings…"
              value={searchQuery}
              onChange={(e) => void setSearchQuery(e.target.value || null)}
              className="pl-9"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center border rounded-lg p-0.5 gap-0.5">
            <Button
              size="icon"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              onClick={() => void setViewMode("grid")}
              className="h-8 w-8"
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
            <div className="h-4 w-0.5 bg-border" />
            <Button
              size="icon"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              onClick={() => void setViewMode("list")}
              className="h-8 w-8"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Add button */}
          <Button
            className="rounded-full"
            size="sm"
            onClick={() => void setViewMode("add")}
          >
            <CirclePlusIcon />
            Add
          </Button>
        </div>
      )}

      {/* Content — hidden in editor mode */}
      {!isEditorMode && (
        <section>
          {filteredRecordings.length === 0 ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex flex-col items-center justify-center h-48 gap-4 rounded-xl border border-dashed border-border text-center"
              >
                {allRecordings.length === 0 ? (
                  <>
                    <p
                      className="text-xl font-semibold text-muted-foreground"
                      style={{ fontFamily: "var(--font-garamond-var)" }}
                    >
                      No recordings yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upload your first audio recording to get started.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void setViewMode("add")}
                    >
                      <CirclePlusIcon />
                      Add recording
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No recordings match your search.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecordings.map((r) => (
                <AudioCard
                  key={r.metadata?.uri ?? r.metadata?.rkey}
                  audio={r}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            /* List view */
            <div
              className={cn(
                "divide-y divide-border rounded-xl border border-border overflow-hidden"
              )}
            >
              {filteredRecordings.map((r) => {
                const name = r.record?.name ?? "Untitled Recording";
                const rkey = r.metadata?.rkey;
                const meta = r.record?.metadata as Record<string, unknown> | null | undefined;
                const recordedAt = meta?.["recordedAt"] as string | undefined;
                return (
                  <div
                    key={r.metadata?.uri ?? rkey}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ fontFamily: "var(--font-garamond-var)" }}
                      >
                        {name}
                      </p>
                      {recordedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(recordedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (rkey) handleEdit(rkey);
                      }}
                      disabled={!rkey}
                    >
                      Edit
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </Container>
  );
}
