"use client";

import { PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";

function EditControls({
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-2"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
            >
              <XIcon className="h-3.5 w-3.5" />
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onSave}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Save changes
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onStartEdit}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Edit Organization
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function OrgPageHeader({
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <HeaderContent
      right={
        <EditControls
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onSave={onSave}
          onCancel={onCancel}
        />
      }
    />
  );
}
