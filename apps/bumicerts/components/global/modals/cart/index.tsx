"use client";

/**
 * CartModal — displays all bumicerts in the cart.
 *
 * Items are grouped:
 *   Top    — accepting donations (status=open, wallet valid+trusted)
 *   Bottom — no longer accepting donations (muted, below a separator)
 *
 * Architecture note:
 *   React hooks cannot be called inside loops. To fetch data for N cart items
 *   independently, each item is rendered as its own <CartItemLoader> component,
 *   which owns its hooks. A <CartItemLoader> reports its resolved state up to
 *   <CartList> via an `onResolved` callback so the parent can group items once
 *   all data has loaded.
 */

import { useState, useEffect, useCallback } from "react";
import { useCartStore } from "@/components/stores/cart";
import { useModal } from "@/components/ui/modal/context";
import { queries } from "@/lib/graphql/queries";
import { clientEnv } from "@/lib/env/client";
import type { CartBumicertItem } from "@/lib/graphql/queries/cartBumicert";
import type { EvmLink } from "@/lib/graphql/queries/linkEvm";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ShoppingCartIcon, Trash2Icon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { links } from "@/lib/links";

// ── Validity helper ────────────────────────────────────────────────────────────

function isLinkValid(link: EvmLink, facilitatorAddress: string | undefined): boolean {
  if (link.specialMetadata?.valid !== true) return false;
  if (!facilitatorAddress) return true;
  const pa = link.record?.platformAttestation?.platformAddress;
  if (!pa) return false;
  return pa.toLowerCase() === facilitatorAddress.toLowerCase();
}

function isDonationOpen(
  item: CartBumicertItem,
  evmLinks: EvmLink[],
  facilitatorAddress: string | undefined
): boolean {
  if (!item.fundingConfig) return false;
  const walletUri = item.fundingConfig.receivingWallet?.uri;
  if (!walletUri) return false;
  if ((item.fundingConfig.status ?? "open") !== "open") return false;
  const link = evmLinks.find((l) => l.metadata?.uri === walletUri);
  return !!link && isLinkValid(link, facilitatorAddress);
}

// ── Resolved item type ────────────────────────────────────────────────────────

type ResolvedCartItem = {
  id: string;
  item: CartBumicertItem;
  isOpen: boolean;
};

// ── Single cart item row ──────────────────────────────────────────────────────

function CartItemRow({
  item,
  unavailable,
  onRemove,
}: {
  item: CartBumicertItem;
  unavailable: boolean;
  onRemove: () => void;
}) {
  const href = `/bumicert/${encodeURIComponent(item.id)}`;

  return (
    <div className={cn(
      "flex items-center gap-3 py-3 border-b border-border/60 last:border-0",
      unavailable && "opacity-50"
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-tight truncate",
          unavailable ? "text-muted-foreground" : "text-foreground"
        )}>
          {item.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.organizationName}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-foreground"
          title="View bumicert"
        >
          <Link href={href}>
            <ExternalLinkIcon className="size-3.5" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          title="Remove from cart"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function CartItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-44" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="size-8 rounded-md shrink-0" />
    </div>
  );
}

// ── Per-item loader component — owns its own hooks ────────────────────────────

function CartItemLoader({
  id,
  facilitatorAddress,
  onRemove,
  onResolved,
}: {
  id: string;
  facilitatorAddress: string | undefined;
  onRemove: () => void;
  onResolved: (id: string, resolved: ResolvedCartItem | null) => void;
}) {
  const { data: item, isLoading: itemLoading } = queries.cartBumicert.useQuery({ id });
  const ownerDid = item?.organizationDid ?? "";
  const { data: evmLinks = [], isLoading: linksLoading } = queries.linkEvm.useQuery({ did: ownerDid });

  const isLoading = itemLoading || (!!ownerDid && linksLoading);

  useEffect(() => {
    if (isLoading) return;
    if (!item) {
      onResolved(id, null);
      return;
    }
    const isOpen = isDonationOpen(item, evmLinks, facilitatorAddress);
    onResolved(id, { id, item, isOpen });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, id, item, evmLinks, facilitatorAddress]);

  if (isLoading) return <CartItemSkeleton />;
  if (!item) return null;

  const isOpen = isDonationOpen(item, evmLinks, facilitatorAddress);
  return (
    <CartItemRow
      item={item}
      unavailable={!isOpen}
      onRemove={onRemove}
    />
  );
}

// ── CartList — manages grouping via resolved callbacks ────────────────────────

function CartList({
  ids,
  facilitatorAddress,
  onRemove,
}: {
  ids: string[];
  facilitatorAddress: string | undefined;
  onRemove: (id: string) => void;
}) {
  const [resolved, setResolved] = useState<Record<string, ResolvedCartItem | null>>({});

  const handleResolved = useCallback((id: string, data: ResolvedCartItem | null) => {
    setResolved((prev) => {
      if (prev[id] === data) return prev;
      return { ...prev, [id]: data };
    });
  }, []);

  const allResolved = ids.every((id) => id in resolved);

  const openItems: ResolvedCartItem[] = [];
  const unavailableItems: ResolvedCartItem[] = [];

  if (allResolved) {
    for (const id of ids) {
      const r = resolved[id];
      if (!r) continue;
      (r.isOpen ? openItems : unavailableItems).push(r);
    }
  }

  return (
    <div>
      {!allResolved ? (
        ids.map((id) => (
          <CartItemLoader
            key={id}
            id={id}
            facilitatorAddress={facilitatorAddress}
            onRemove={() => onRemove(id)}
            onResolved={handleResolved}
          />
        ))
      ) : (
        <>
          {openItems.map(({ id, item }) => (
            <CartItemRow
              key={id}
              item={item}
              unavailable={false}
              onRemove={() => onRemove(id)}
            />
          ))}
          {unavailableItems.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  No longer accepting donations
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {unavailableItems.map(({ id, item }) => (
                <CartItemRow
                  key={id}
                  item={item}
                  unavailable
                  onRemove={() => onRemove(id)}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <ShoppingCartIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Your cart is empty</p>
        <p className="text-xs text-muted-foreground">
          Add bumicerts you&apos;d like to donate to later.
        </p>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href={links.explore}>Explore Bumicerts</Link>
      </Button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CartModal() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const facilitatorAddress = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;
  const { stack, hide, popModal } = useModal();

  const handleClose = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  return (
    <ModalContent>
      <ModalHeader
        backAction={stack.length > 1 ? handleClose : undefined}
      >
        <ModalTitle>Your Cart</ModalTitle>
      </ModalHeader>

      <div className="pt-1">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <CartList
            ids={items}
            facilitatorAddress={facilitatorAddress}
            onRemove={removeItem}
          />
        )}
      </div>
    </ModalContent>
  );
}
