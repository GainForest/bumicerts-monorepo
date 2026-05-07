"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { AuthenticatedAccountState } from "@/lib/account";
import { links } from "@/lib/links";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { useAtprotoStore } from "@/components/stores/atproto";
import { logout } from "@/components/actions/oauth";
import { useModal } from "@/components/ui/modal/context";
import { useAccount } from "@/components/providers/AccountProvider";

const AuthModal = dynamic(
  () => import("./AuthModal").then((module) => ({ default: module.AuthModal })),
  { ssr: false },
);

function truncateDid(did: string): string {
  return did.length > 18 ? `${did.slice(0, 16)}…` : did;
}

function getResolvedAvatarUrl(
  account: AuthenticatedAccountState,
  fallbackAvatar: string | undefined,
): string | undefined {
  if (account.kind === "user" || account.kind === "organization") {
    const avatar = account.profile.avatar;
    if (
      avatar &&
      typeof avatar === "object" &&
      "uri" in avatar &&
      typeof avatar.uri === "string"
    ) {
      return avatar.uri;
    }
  }

  return fallbackAvatar;
}

function getDisplayLabel(
  account: AuthenticatedAccountState,
  fallbackDisplayName: string | undefined,
  fallbackHandle: string | undefined,
): string {
  if (account.kind === "unknown") {
    return "Unknown";
  }

  return (
    account.profile.displayName ??
    fallbackDisplayName ??
    fallbackHandle ??
    truncateDid(account.did)
  );
}

function getSecondaryLabel(
  account: AuthenticatedAccountState,
  fallbackHandle: string | undefined,
): string | null {
  if (account.kind === "unknown") {
    return "Complete onboarding";
  }

  if (fallbackHandle) {
    return `@${fallbackHandle}`;
  }

  return account.kind === "organization" ? "Organization account" : "User account";
}

function getAccountHref(account: AuthenticatedAccountState): string {
  if (account.kind === "unknown") {
    return links.account.self;
  }

  return links.account.self;
}

function AuthSkeleton() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 animate-pulse">
      <div className="h-7 w-7 rounded-full bg-muted" />
      <div className="hidden sm:block h-3 w-20 rounded bg-muted" />
    </div>
  );
}

function UnauthenticatedButtons() {
  const { pushModal, show } = useModal();

  const openAuth = () => {
    pushModal(
      {
        id: "auth",
        content: <AuthModal />,
      },
      true,
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

function AuthenticatedMenu({
  account,
  fallbackHandle,
  fallbackDisplayName,
  fallbackAvatar,
}: {
  account: AuthenticatedAccountState;
  fallbackHandle?: string;
  fallbackDisplayName?: string;
  fallbackAvatar?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const accountUtils = indexerTrpc.useUtils();
  const { setAuth } = useAtprotoStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel = getDisplayLabel(
    account,
    fallbackDisplayName,
    fallbackHandle,
  );
  const secondaryLabel = getSecondaryLabel(account, fallbackHandle);
  const avatarUrl = getResolvedAvatarUrl(account, fallbackAvatar);
  const accountHref = getAccountHref(account);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    accountUtils.account.current.setData(undefined, {
      kind: "unauthenticated",
      did: null,
      profile: null,
      organization: null,
    });
    setAuth(null);
    router.refresh();
  };

  const handleBlur = (event: React.FocusEvent) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group"
      >
        <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayLabel}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserIcon className="h-3.5 w-3.5 text-primary" />
          )}
        </div>

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
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">
                {displayLabel}
              </p>
              {secondaryLabel && (
                <p className="text-xs text-muted-foreground truncate">
                  {secondaryLabel}
                </p>
              )}
            </div>

            <div className="p-1">
              <Link
                href={accountHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted/60 transition-colors w-full text-left"
              >
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                My Account
              </Link>

              <div className="h-px bg-border/60 my-1" />

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

export function UserMenu() {
  const auth = useAtprotoStore((state) => state.auth);
  const { account, query } = useAccount();

  const fallbackAccount: AuthenticatedAccountState | undefined =
    auth.status === "AUTHENTICATED"
      ? {
          kind: "unknown",
          did: auth.user.did,
          profile: null,
          organization: null,
        }
      : undefined;

  const resolvedAccount =
    account && account.kind !== "unauthenticated" ? account : fallbackAccount;

  if (query.isLoading && !resolvedAccount) {
    return <AuthSkeleton />;
  }

  if (resolvedAccount) {
    return (
      <AuthenticatedMenu
        account={resolvedAccount}
        fallbackHandle={auth.status === "AUTHENTICATED" ? auth.user.handle : undefined}
        fallbackDisplayName={
          auth.status === "AUTHENTICATED" ? auth.user.displayName : undefined
        }
        fallbackAvatar={auth.status === "AUTHENTICATED" ? auth.user.avatar : undefined}
      />
    );
  }

  return <UnauthenticatedButtons />;
}
