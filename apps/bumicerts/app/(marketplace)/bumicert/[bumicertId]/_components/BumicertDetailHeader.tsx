"use client";

import { useState } from "react";
import { useHeaderContext } from "@/app/(marketplace)/_components/Header/context";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { CopyIcon, ExternalLinkIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

function CopyButton({ bumicertId }: { bumicertId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(bumicertId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
        {bumicertId}
      </span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CheckIcon className="h-3 w-3 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CopyIcon className="h-3 w-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export function BumicertDetailHeader({ bumicertId }: { bumicertId: string }) {
  const { isUnauthenticated } = useHeaderContext();

  return (
    <HeaderContent
      left={<CopyButton bumicertId={bumicertId} />}
      right={
        <Button
          variant={isUnauthenticated ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
          Fund this project
        </Button>
      }
    />
  );
}
