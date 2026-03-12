"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LogOutIcon, BuildingIcon, ChevronDownIcon, UserIcon } from "lucide-react";
import { useAtprotoStore } from "@/components/stores/atproto";
import { logout } from "@/components/actions/oauth";
import { useModal } from "@/components/ui/modal/context";
import dynamic from "next/dynamic";
import Link from "next/link";
import { links } from "@/lib/links";

const AuthModal = dynamic(
  () => import("./AuthModal").then((m) => ({ default: m.AuthModal })),
  { ssr: false }
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function AuthSkeleton() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 animate-pulse">
      <div className="h-7 w-7 rounded-full bg-muted" />
      <div className="hidden sm:block h-3 w-20 rounded bg-muted" />
    </div>
  );
}

// ─── Unauthenticated ───────────────────────────────────────────────────────────

function UnauthenticatedButtons() {
  const { pushModal, show } = useModal();

  const openAuth = () => {
    pushModal(
      {
        id: "auth",
        content: <AuthModal />,
      },
      true
    );
    show();
  };

  return (
    <motion.button
      onClick={openAuth}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="text-sm font-medium bg-primary text-primary-foreground rounded-full px-3.5 py-1.5 hover:bg-primary/90 transition-colors cursor-pointer"
    >
      Get started
    </motion.button>
  );
}

// ─── Authenticated dropdown ────────────────────────────────────────────────────

function AuthenticatedMenu({ did, handle, displayName, avatar }: {
  did: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setAuth } = useAtprotoStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    setAuth(null);
    router.refresh();
  };

  const displayLabel = displayName ?? handle ?? did.slice(0, 16) + "…";
  const handleLabel = handle ? `@${handle}` : null;

  // Close when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group"
      >
        {/* Avatar */}
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={displayLabel} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="h-3.5 w-3.5 text-primary" />
          )}
        </div>

        {/* Name — hidden on small screens */}
        <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
          {displayLabel}
        </span>

        <motion.div
          className="hidden sm:block"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-border bg-background/95 backdrop-blur-sm shadow-xl shadow-black/10 overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{displayLabel}</p>
              {handleLabel && (
                <p className="text-xs text-muted-foreground truncate">{handleLabel}</p>
              )}
            </div>

            {/* Menu items */}
            <div className="p-1">
              <Link
                href={links.organization.home(did)}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors w-full text-left"
              >
                <BuildingIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                My Organization
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full text-left cursor-pointer"
              >
                <LogOutIcon className="h-3.5 w-3.5 shrink-0" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function UserMenu() {
  const auth = useAtprotoStore((s) => s.auth);
  const isReady = useAtprotoStore((s) => s.isReady);

  if (!isReady || auth.status === "RESUMING") {
    return <AuthSkeleton />;
  }

  if (auth.status === "AUTHENTICATED") {
    return (
      <AuthenticatedMenu
        did={auth.user.did}
        handle={auth.user.handle}
        displayName={auth.user.displayName}
        avatar={auth.user.avatar}
      />
    );
  }

  return <UnauthenticatedButtons />;
}
