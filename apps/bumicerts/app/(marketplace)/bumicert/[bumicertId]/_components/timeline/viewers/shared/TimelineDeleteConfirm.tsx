import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineDeleteConfirmProps {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
  error: string | null;
}

export function TimelineDeleteConfirm({
  title,
  onConfirm,
  onCancel,
  isDeleting,
  error,
}: TimelineDeleteConfirmProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2"
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <p className="text-xs font-medium">
            Remove &ldquo;{title}&rdquo;? This cannot be undone.
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs px-3"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Removing…" : "Remove"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-3"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
